package ui

import (
	"encoding/base64"
	"fmt"
	"os"
	"path/filepath"
	"time"
)

// ScreenshotManager handles screenshot file creation, storage, and retrieval
type ScreenshotManager struct {
	baseDir string
}

// NewScreenshotManager creates a new ScreenshotManager with path inside user's app data directory
func NewScreenshotManager() *ScreenshotManager {
	dir, err := os.UserConfigDir()
	if err != nil {
		dir = "."
	}
	screenshotsDir := filepath.Join(dir, "internal-api-client", "screenshots")
	_ = os.MkdirAll(screenshotsDir, 0755)
	return &ScreenshotManager{
		baseDir: screenshotsDir,
	}
}

// GenerateScreenshotPath generates a unique file path for a failed step screenshot
func (sm *ScreenshotManager) GenerateScreenshotPath(scenarioID, stepID string) string {
	timestamp := time.Now().Format("20060102_150405_000")
	safeScenarioID := sanitizeFileName(scenarioID)
	safeStepID := sanitizeFileName(stepID)
	fileName := fmt.Sprintf("fail_%s_%s_%s.png", safeScenarioID, safeStepID, timestamp)
	return filepath.Join(sm.baseDir, fileName)
}

// ReadScreenshotAsBase64 reads a screenshot image and encodes it to base64 data URI
func (sm *ScreenshotManager) ReadScreenshotAsBase64(filePath string) (string, error) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		return "", err
	}
	encoded := base64.StdEncoding.EncodeToString(data)
	return "data:image/png;base64," + encoded, nil
}

func sanitizeFileName(name string) string {
	var out []rune
	for _, r := range name {
		if (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') || r == '_' || r == '-' {
			out = append(out, r)
		} else {
			out = append(out, '_')
		}
	}
	return string(out)
}
