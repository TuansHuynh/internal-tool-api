package core_test

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"internal-api-client/core"
)

func TestHttpMethods(t *testing.T) {
	// Setup test server that handles and verifies GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		bodyBytes, _ := io.ReadAll(r.Body)
		bodyStr := string(bodyBytes)

		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-Received-Method", r.Method)
		w.Header().Set("X-Custom-Header", r.Header.Get("X-Custom-Header"))

		responseMap := map[string]interface{}{
			"method":       r.Method,
			"path":         r.URL.Path,
			"query":        r.URL.RawQuery,
			"receivedBody": bodyStr,
			"auth":         r.Header.Get("Authorization"),
		}

		if r.Method == http.MethodHead {
			w.WriteHeader(http.StatusOK)
			return
		}

		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(responseMap)
	}))
	defer server.Close()

	engine := core.NewHttpClientEngine(true, 10)

	testCases := []struct {
		name         string
		method       string
		path         string
		body         string
		headers      map[string]string
		expectStatus int
	}{
		{
			name:         "Test GET method",
			method:       "GET",
			path:         "/api/v1/users?page=1&limit=10",
			body:         "",
			headers:      map[string]string{"Accept": "application/json", "Authorization": "Bearer test_token"},
			expectStatus: 200,
		},
		{
			name:         "Test POST method with JSON body",
			method:       "POST",
			path:         "/api/v1/users",
			body:         `{"name":"John Doe","email":"john@example.com"}`,
			headers:      map[string]string{"Content-Type": "application/json", "X-Custom-Header": "CustomVal"},
			expectStatus: 200,
		},
		{
			name:         "Test PUT method with JSON body",
			method:       "PUT",
			path:         "/api/v1/users/123",
			body:         `{"name":"John Updated","role":"admin"}`,
			headers:      map[string]string{"Content-Type": "application/json"},
			expectStatus: 200,
		},
		{
			name:         "Test PATCH method with partial JSON body",
			method:       "PATCH",
			path:         "/api/v1/users/123",
			body:         `{"status":"active"}`,
			headers:      map[string]string{"Content-Type": "application/json"},
			expectStatus: 200,
		},
		{
			name:         "Test DELETE method with query & body",
			method:       "DELETE",
			path:         "/api/v1/users/123?cascade=true",
			body:         `{"reason":"deactivated"}`,
			headers:      map[string]string{"Content-Type": "application/json"},
			expectStatus: 200,
		},
		{
			name:         "Test HEAD method",
			method:       "HEAD",
			path:         "/api/v1/health",
			body:         "",
			headers:      nil,
			expectStatus: 200,
		},
		{
			name:         "Test OPTIONS method",
			method:       "OPTIONS",
			path:         "/api/v1/cors",
			body:         "",
			headers:      nil,
			expectStatus: 200,
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			payload := core.RequestPayload{
				Method:  tc.method,
				URL:     server.URL + tc.path,
				Headers: tc.headers,
				Body:    tc.body,
			}

			res, err := engine.Execute(payload)
			if err != nil {
				t.Fatalf("[%s] Engine Execute failed: %v", tc.method, err)
			}

			if res.Status != tc.expectStatus {
				t.Errorf("[%s] Expected status %d, got %d", tc.method, tc.expectStatus, res.Status)
			}

			if res.Timing.TotalTimeMs < 0 {
				t.Errorf("[%s] TotalTimeMs should be >= 0", tc.method)
			}

			// Validate response content for methods returning bodies
			if tc.method != "HEAD" {
				var parsed map[string]interface{}
				if err := json.Unmarshal([]byte(res.Body), &parsed); err != nil {
					t.Fatalf("[%s] Failed to parse response JSON: %v", tc.method, err)
				}

				if parsed["method"] != tc.method {
					t.Errorf("[%s] Server received wrong method: %v", tc.method, parsed["method"])
				}

				if tc.body != "" {
					receivedBody, ok := parsed["receivedBody"].(string)
					if !ok || receivedBody != tc.body {
						t.Errorf("[%s] Expected received body %s, got %v", tc.method, tc.body, parsed["receivedBody"])
					}
				}

				if tc.headers != nil && tc.headers["X-Custom-Header"] != "" {
					if res.Headers["X-Custom-Header"] != tc.headers["X-Custom-Header"] {
						t.Errorf("[%s] Custom header mismatch: expected %s, got %s", tc.method, tc.headers["X-Custom-Header"], res.Headers["X-Custom-Header"])
					}
				}
			}
		})
	}
}

func TestStressEngineWithMethods(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/error") {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok"}`))
	}))
	defer server.Close()

	engine := core.NewHttpClientEngine(true, 5)

	methods := []string{"GET", "POST", "PUT", "PATCH", "DELETE"}
	for _, m := range methods {
		t.Run("Stress_"+m, func(t *testing.T) {
			payload := core.RequestPayload{
				Method: m,
				URL:    server.URL + "/test",
				Body:   `{"test":true}`,
			}

			res := engine.ExecuteStressTest(payload, 5, 20, 0, 0, 0)
			if res.TotalRequests != 20 {
				t.Errorf("[%s] Expected 20 requests, got %d", m, res.TotalRequests)
			}
			if res.SuccessCount != 20 {
				t.Errorf("[%s] Expected 20 success, got %d", m, res.SuccessCount)
			}
			if res.FailureCount != 0 {
				t.Errorf("[%s] Expected 0 failures, got %d", m, res.FailureCount)
			}
		})
	}
}
