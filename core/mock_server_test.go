package core

import (
	"fmt"
	"io"
	"net/http"
	"testing"
	"time"
)

func TestMockServerEngine(t *testing.T) {
	engine := NewMockServerEngine()
	port := 19095

	routes := []MockRoute{
		{
			ID:              "route_1",
			Path:            "/api/v1/ping",
			Method:          "GET",
			StatusCode:      200,
			ResponseHeaders: map[string]string{"Content-Type": "application/json"},
			ResponseBody:    `{"pong": true}`,
			DelayMs:         10,
			Enabled:         true,
		},
		{
			ID:              "route_2",
			Path:            "/api/v1/users",
			Method:          "POST",
			StatusCode:      201,
			ResponseHeaders: map[string]string{"Content-Type": "application/json"},
			ResponseBody:    `{"id": 101, "created": true}`,
			DelayMs:         0,
			Enabled:         true,
		},
	}

	err := engine.Start(port, routes)
	if err != nil {
		t.Fatalf("Failed to start mock server: %v", err)
	}
	defer engine.Stop()

	// Wait briefly for server to listen
	time.Sleep(50 * time.Millisecond)

	status := engine.GetStatus()
	if !status.IsRunning {
		t.Errorf("Expected mock server to be running")
	}

	// Test GET /api/v1/ping
	resp, err := http.Get(fmt.Sprintf("http://localhost:%d/api/v1/ping", port))
	if err != nil {
		t.Fatalf("Failed to send GET to mock server: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		t.Errorf("Expected status 200, got %d", resp.StatusCode)
	}

	bodyBytes, _ := io.ReadAll(resp.Body)
	if string(bodyBytes) != `{"pong": true}` {
		t.Errorf("Unexpected body: %s", string(bodyBytes))
	}

	// Check status logs
	statusAfter := engine.GetStatus()
	if len(statusAfter.Logs) == 0 {
		t.Errorf("Expected logs to contain the request")
	}
}
