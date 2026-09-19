package ui

import "time"

// BrowserType defines the target browser
type BrowserType string

const (
	BrowserChromium BrowserType = "chromium"
	BrowserFirefox  BrowserType = "firefox"
	BrowserWebKit   BrowserType = "webkit"
)

// StepType defines supported UI actions and assertions
type StepType string

const (
	// Browser Actions
	StepNavigate   StepType = "navigate"
	StepClick      StepType = "click"
	StepDblClick   StepType = "dblclick"
	StepInput      StepType = "input"
	StepClear      StepType = "clear"
	StepSelect     StepType = "select"
	StepCheck      StepType = "check"
	StepUncheck    StepType = "uncheck"
	StepHover      StepType = "hover"
	StepScroll     StepType = "scroll"
	StepPressKey   StepType = "press_key"
	StepUploadFile StepType = "upload_file"
	StepWait       StepType = "wait"

	// Assertions
	StepAssertExists    StepType = "assert_element_exists"
	StepAssertVisible   StepType = "assert_element_visible"
	StepAssertEnabled   StepType = "assert_element_enabled"
	StepAssertText      StepType = "assert_text"
	StepAssertValue     StepType = "assert_value"
	StepAssertAttribute StepType = "assert_attribute"
	StepAssertURL       StepType = "assert_url"
	StepAssertTitle     StepType = "assert_title"
)

// UIStep represents a single test step in a scenario
type UIStep struct {
	ID         string   `json:"id"`
	ScenarioID string   `json:"scenarioId"`
	SortOrder  int      `json:"sortOrder"`
	Type       StepType `json:"type"`
	Selector   string   `json:"selector"`
	Value      string   `json:"value"`
	Timeout    int      `json:"timeout"` // In milliseconds (default: 5000)
	ConfigJSON string   `json:"configJson"`
	CreatedAt  string   `json:"createdAt,omitempty"`
}

// UIScenario represents a complete test scenario
type UIScenario struct {
	ID        string      `json:"id"`
	ProjectID string      `json:"projectId,omitempty"`
	FolderID  string      `json:"folderId,omitempty"`
	Name      string      `json:"name"`
	Browser   BrowserType `json:"browser"`
	BaseURL   string      `json:"baseUrl"`
	CreatedAt string      `json:"createdAt,omitempty"`
	UpdatedAt string      `json:"updatedAt,omitempty"`
	Steps     []UIStep    `json:"steps"`
}

// StepResultStatus defines the execution status of a single step
type StepResultStatus string

const (
	StatusPassed  StepResultStatus = "PASSED"
	StatusFailed  StepResultStatus = "FAILED"
	StatusSkipped StepResultStatus = "SKIPPED"
	StatusRunning StepResultStatus = "RUNNING"
)

// StepExecutionResult contains the result of executing one step
type StepExecutionResult struct {
	StepID         string           `json:"stepId"`
	StepOrder      int              `json:"stepOrder"`
	StepType       StepType         `json:"stepType"`
	StepName       string           `json:"stepName"`
	Status         StepResultStatus `json:"status"`
	DurationMs     int64            `json:"durationMs"`
	Error          string           `json:"error,omitempty"`
	ScreenshotPath string           `json:"screenshotPath,omitempty"`
	ScreenshotB64  string           `json:"screenshotB64,omitempty"`
	Details        string           `json:"details,omitempty"`
}

// TestRunStatus defines the status of an entire test run
type TestRunStatus string

const (
	RunStatusPassed    TestRunStatus = "PASSED"
	RunStatusFailed    TestRunStatus = "FAILED"
	RunStatusCancelled TestRunStatus = "CANCELLED"
	RunStatusRunning   TestRunStatus = "RUNNING"
)

// TestRunSummary aggregates the entire execution result of a scenario
type TestRunSummary struct {
	RunID        string                `json:"runId"`
	ScenarioID   string                `json:"scenarioId"`
	ScenarioName string                `json:"scenarioName"`
	Status       TestRunStatus         `json:"status"`
	StartedAt    time.Time             `json:"startedAt"`
	FinishedAt   time.Time             `json:"finishedAt"`
	DurationMs   int64                 `json:"durationMs"`
	TotalSteps   int                   `json:"totalSteps"`
	PassedSteps  int                   `json:"passedSteps"`
	FailedSteps  int                   `json:"failedSteps"`
	SkippedSteps int                   `json:"skippedSteps"`
	StepResults  []StepExecutionResult `json:"stepResults"`
	ErrorMessage string                `json:"errorMessage,omitempty"`
}

// StepProgressEvent is emitted to frontend via Wails during execution
type StepProgressEvent struct {
	RunID      string              `json:"runId"`
	ScenarioID string              `json:"scenarioId"`
	Phase      string              `json:"phase"` // "start" | "step_start" | "step_end" | "done"
	Current    int                 `json:"current"`
	Total      int                 `json:"total"`
	StepResult StepExecutionResult `json:"stepResult,omitempty"`
	Summary    *TestRunSummary     `json:"summary,omitempty"`
}
