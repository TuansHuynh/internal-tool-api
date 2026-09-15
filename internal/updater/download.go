package updater

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
)

// TempDownloadDir returns the OS-appropriate temp directory for downloads.
// Windows: %TEMP%\internal-api-client\update\
// Linux/macOS: /tmp/internal-api-client/update/
func TempDownloadDir() string {
	var base string
	if runtime.GOOS == "windows" {
		base = os.Getenv("TEMP")
		if base == "" {
			base = os.Getenv("TMP")
		}
		if base == "" {
			base = filepath.Join(os.Getenv("USERPROFILE"), "AppData", "Local", "Temp")
		}
	} else {
		base = "/tmp"
	}
	return filepath.Join(base, "internal-api-client", "update")
}

// DownloadDestination returns the full path for the downloaded update binary.
// Example: C:\Temp\internal-api-client\update\internal-api-client-update-v1.4.0.exe
func DownloadDestination(version string) string {
	ext := ""
	if runtime.GOOS == "windows" {
		ext = ".exe"
	}
	filename := fmt.Sprintf("internal-api-client-update-v%s%s", strings.TrimPrefix(version, "v"), ext)
	return filepath.Join(TempDownloadDir(), filename)
}

// DownloadUpdate streams the binary from url to destination, computes its SHA-256
// checksum on-the-fly, and verifies it against expectedSHA256 after completion.
//
//   - progressCallback receives (bytesDownloaded, totalBytes).
//     totalBytes is -1 when Content-Length is unknown.
//   - Returns nil only if download AND checksum verification succeed.
//   - On any failure the partially/fully downloaded file is removed.
func DownloadUpdate(
	client *http.Client,
	url string,
	expectedSHA256 string,
	destination string,
	progressCallback func(downloaded, total int64),
) error {
	// Ensure destination directory exists.
	if err := os.MkdirAll(filepath.Dir(destination), 0o755); err != nil {
		return fmt.Errorf("create temp dir: %w", err)
	}

	resp, err := client.Get(url)
	if err != nil {
		return fmt.Errorf("http get: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected http status %d for %s", resp.StatusCode, url)
	}

	totalBytes := resp.ContentLength // -1 if unknown

	out, err := os.Create(destination)
	if err != nil {
		return fmt.Errorf("create destination file: %w", err)
	}

	// On any error after file creation, remove the partial file.
	removeOnErr := func(writeErr error) error {
		out.Close()
		_ = os.Remove(destination)
		return writeErr
	}

	hasher := sha256.New()

	// Wrap body in a progressReader that tees into the hasher.
	pr := &progressReader{
		reader:    resp.Body,
		hasher:    hasher,
		total:     totalBytes,
		callback:  progressCallback,
	}

	if _, err = io.Copy(out, pr); err != nil {
		return removeOnErr(fmt.Errorf("stream download: %w", err))
	}

	if err = out.Close(); err != nil {
		_ = os.Remove(destination)
		return fmt.Errorf("close destination file: %w", err)
	}

	// Verify checksum.
	actualSHA256 := hex.EncodeToString(hasher.Sum(nil))
	expected := strings.ToLower(strings.TrimSpace(expectedSHA256))
	if actualSHA256 != expected {
		_ = os.Remove(destination)
		return fmt.Errorf("SHA-256 mismatch: expected %s, got %s", expected, actualSHA256)
	}

	return nil
}

// progressReader wraps an io.Reader and reports progress via a callback while
// simultaneously writing data to a hash.Writer.
type progressReader struct {
	reader     io.Reader
	hasher     io.Writer
	total      int64
	downloaded int64
	callback   func(downloaded, total int64)
}

func (pr *progressReader) Read(p []byte) (int, error) {
	n, err := pr.reader.Read(p)
	if n > 0 {
		pr.downloaded += int64(n)
		_, _ = pr.hasher.Write(p[:n])
		if pr.callback != nil {
			pr.callback(pr.downloaded, pr.total)
		}
	}
	return n, err
}
