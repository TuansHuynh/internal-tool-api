package core

import (
	"context"
	"crypto/tls"
	"io"
	"net/http"
	"net/http/httptrace"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

// ==========================================
// 1. DATA MODELS
// ==========================================

type TimingDetails struct {
	DNSTimeMs      int64 `json:"dnsTimeMs"`
	TCPTimeMs      int64 `json:"tcpTimeMs"`
	TLSTimeMs      int64 `json:"tlsTimeMs"`
	TTFBMs         int64 `json:"ttfbMs"`
	DownloadTimeMs int64 `json:"downloadTimeMs"`
	TotalTimeMs    int64 `json:"totalTimeMs"`
}

type RequestPayload struct {
	Method   string            `json:"method"`
	URL      string            `json:"url"`
	Headers  map[string]string `json:"headers"`
	Body     string            `json:"body"`
	BodyType string            `json:"bodyType,omitempty"`
}

type ResponsePayload struct {
	Status       int               `json:"status"`
	StatusText   string            `json:"statusText"`
	Body         string            `json:"body"`
	Headers      map[string]string `json:"headers"`
	ResponseTime int64             `json:"responseTimeMs"`
	ResponseSize int64             `json:"responseSizeByte"`
	Timing       TimingDetails     `json:"timing"`
}

type StressTestResult struct {
	TotalRequests int64   `json:"totalRequests"`
	SuccessCount  int64   `json:"successCount"`
	FailureCount  int64   `json:"failureCount"`
	AverageTimeMs int64   `json:"averageTimeMs"`
	RPS           float64 `json:"rps"`
	Cancelled     bool    `json:"cancelled"`
}

// ==========================================
// 2. HTTP CLIENT ENGINE
// ==========================================

type HttpClientEngine struct {
	Client       *http.Client
	cancelStress context.CancelFunc
	stressMu     sync.Mutex
}

func NewHttpClientEngine(allowInsecure bool, timeoutSec int) *HttpClientEngine {
	transport := &http.Transport{
		TLSClientConfig: &tls.Config{
			InsecureSkipVerify: allowInsecure,
		},
		MaxIdleConns:        100,
		IdleConnTimeout:     90 * time.Second,
		TLSHandshakeTimeout: 10 * time.Second,
	}

	return &HttpClientEngine{
		Client: &http.Client{
			Transport: transport,
			Timeout:   time.Duration(timeoutSec) * time.Second,
		},
	}
}

func (e *HttpClientEngine) Execute(payload RequestPayload) (ResponsePayload, error) {
	var resPayload ResponsePayload
	resPayload.Headers = make(map[string]string)

	var bodyReader io.Reader
	if payload.Body != "" {
		bodyReader = strings.NewReader(payload.Body)
	}

	req, err := http.NewRequest(payload.Method, payload.URL, bodyReader)
	if err != nil {
		return resPayload, err
	}

	for k, v := range payload.Headers {
		req.Header.Set(k, v)
	}
	if req.Header.Get("User-Agent") == "" {
		req.Header.Set("User-Agent", "InternalApiClient-Go/2.0")
	}

	// Trace Network Timings
	var dnsStart, dnsDone time.Time
	var connStart, connDone time.Time
	var tlsStart, tlsDone time.Time
	var gotFirstByte time.Time

	trace := &httptrace.ClientTrace{
		DNSStart: func(info httptrace.DNSStartInfo) {
			dnsStart = time.Now()
		},
		DNSDone: func(info httptrace.DNSDoneInfo) {
			dnsDone = time.Now()
		},
		ConnectStart: func(network, addr string) {
			connStart = time.Now()
		},
		ConnectDone: func(network, addr string, err error) {
			connDone = time.Now()
		},
		TLSHandshakeStart: func() {
			tlsStart = time.Now()
		},
		TLSHandshakeDone: func(state tls.ConnectionState, err error) {
			tlsDone = time.Now()
		},
		GotFirstResponseByte: func() {
			gotFirstByte = time.Now()
		},
	}

	req = req.WithContext(httptrace.WithClientTrace(req.Context(), trace))

	startTime := time.Now()
	resp, err := e.Client.Do(req)
	if err != nil {
		return resPayload, err
	}
	defer resp.Body.Close()

	bodyReadStart := time.Now()
	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return resPayload, err
	}
	totalDuration := time.Since(startTime).Milliseconds()

	// Calculate granular timings
	var dnsTime, tcpTime, tlsTime, ttfbTime, downloadTime int64
	if !dnsStart.IsZero() && !dnsDone.IsZero() {
		dnsTime = dnsDone.Sub(dnsStart).Milliseconds()
	}
	if !connStart.IsZero() && !connDone.IsZero() {
		tcpTime = connDone.Sub(connStart).Milliseconds()
	}
	if !tlsStart.IsZero() && !tlsDone.IsZero() {
		tlsTime = tlsDone.Sub(tlsStart).Milliseconds()
	}
	if !gotFirstByte.IsZero() {
		ttfbTime = gotFirstByte.Sub(startTime).Milliseconds()
	} else {
		ttfbTime = totalDuration
	}
	downloadTime = time.Since(bodyReadStart).Milliseconds()

	for k, v := range resp.Header {
		if len(v) > 0 {
			resPayload.Headers[k] = strings.Join(v, ", ")
		}
	}

	resPayload.Status = resp.StatusCode
	resPayload.StatusText = resp.Status
	resPayload.Body = string(bodyBytes)
	resPayload.ResponseTime = totalDuration
	resPayload.ResponseSize = int64(len(bodyBytes))
	resPayload.Timing = TimingDetails{
		DNSTimeMs:      dnsTime,
		TCPTimeMs:      tcpTime,
		TLSTimeMs:      tlsTime,
		TTFBMs:         ttfbTime,
		DownloadTimeMs: downloadTime,
		TotalTimeMs:    totalDuration,
	}

	return resPayload, nil
}

// ==========================================
// 3. STRESS TEST ENGINE
// ==========================================

func (e *HttpClientEngine) CancelStressTest() {
	e.stressMu.Lock()
	defer e.stressMu.Unlock()
	if e.cancelStress != nil {
		e.cancelStress()
		e.cancelStress = nil
	}
}

func (e *HttpClientEngine) ExecuteStressTest(payload RequestPayload, concurrency int, totalRequests int, durationSec int, rampUpSec int, targetRPS int) StressTestResult {
	e.stressMu.Lock()
	ctx, cancel := context.WithCancel(context.Background())
	if durationSec > 0 {
		ctx, cancel = context.WithTimeout(ctx, time.Duration(rampUpSec+durationSec)*time.Second)
	}
	e.cancelStress = cancel
	e.stressMu.Unlock()

	defer func() {
		e.stressMu.Lock()
		if e.cancelStress != nil {
			cancel()
			e.cancelStress = nil
		}
		e.stressMu.Unlock()
	}()

	var wg sync.WaitGroup
	var successCount, failureCount, totalDurationMs int64
	var actualTotalRequests int64
	var isCancelled atomic.Bool

	useDuration := durationSec > 0

	var jobs chan struct{}
	if !useDuration {
		jobs = make(chan struct{}, totalRequests)
		for i := 0; i < totalRequests; i++ {
			jobs <- struct{}{}
		}
		close(jobs)
	}

	var delayPerThread time.Duration
	if rampUpSec > 0 && concurrency > 1 {
		delayPerThread = time.Duration(rampUpSec) * time.Second / time.Duration(concurrency)
	}

	var rateLimiter <-chan time.Time
	if targetRPS > 0 {
		ticker := time.NewTicker(time.Second / time.Duration(targetRPS))
		defer ticker.Stop()
		rateLimiter = ticker.C
	}

	testStartTime := time.Now()

	for w := 0; w < concurrency; w++ {
		wg.Add(1)

		if delayPerThread > 0 {
			time.Sleep(delayPerThread)
		}

		go func() {
			defer wg.Done()

			if useDuration {
				for {
					select {
					case <-ctx.Done():
						isCancelled.Store(true)
						return
					default:
						if rateLimiter != nil {
							select {
							case <-rateLimiter:
							case <-ctx.Done():
								isCancelled.Store(true)
								return
							}
						}

						atomic.AddInt64(&actualTotalRequests, 1)
						res, err := e.Execute(payload)
						if err != nil || res.Status >= 400 {
							atomic.AddInt64(&failureCount, 1)
						} else {
							atomic.AddInt64(&successCount, 1)
							atomic.AddInt64(&totalDurationMs, res.ResponseTime)
						}
					}
				}
			} else {
				for range jobs {
					select {
					case <-ctx.Done():
						isCancelled.Store(true)
						return
					default:
						if rateLimiter != nil {
							select {
							case <-rateLimiter:
							case <-ctx.Done():
								isCancelled.Store(true)
								return
							}
						}
						atomic.AddInt64(&actualTotalRequests, 1)
						res, err := e.Execute(payload)
						if err != nil || res.Status >= 400 {
							atomic.AddInt64(&failureCount, 1)
						} else {
							atomic.AddInt64(&successCount, 1)
							atomic.AddInt64(&totalDurationMs, res.ResponseTime)
						}
					}
				}
			}
		}()
	}

	wg.Wait()
	elapsedSec := time.Since(testStartTime).Seconds()

	var avgTime int64
	if successCount > 0 {
		avgTime = totalDurationMs / successCount
	}

	var rps float64
	if elapsedSec > 0 {
		rps = float64(actualTotalRequests) / elapsedSec
	}

	return StressTestResult{
		TotalRequests: actualTotalRequests,
		SuccessCount:  successCount,
		FailureCount:  failureCount,
		AverageTimeMs: avgTime,
		RPS:           rps,
		Cancelled:     isCancelled.Load(),
	}
}