package updater

import (
	"fmt"
	"runtime"
)

// UpdateManifest is the structure of the latest.json file served by the release server.
type UpdateManifest struct {
	Version   string              `json:"version"`
	Platforms map[string]Platform `json:"platforms"`
}

// Platform holds the download URL and expected SHA-256 checksum for a specific OS/arch.
type Platform struct {
	URL    string `json:"url"`
	SHA256 string `json:"sha256"`
}

// UpdateInfo is returned by CheckForUpdate when a newer version is available.
type UpdateInfo struct {
	// Version is the new version string, e.g. "1.4.0"
	Version string
	// URL is the direct download URL for the binary on this platform.
	URL string
	// SHA256 is the expected hex-encoded SHA-256 checksum of the binary.
	SHA256 string
}

// CurrentPlatformKey returns the manifest platform key for the running OS and architecture.
// Examples: "windows-amd64", "linux-amd64", "darwin-arm64"
func CurrentPlatformKey() string {
	return fmt.Sprintf("%s-%s", runtime.GOOS, runtime.GOARCH)
}

// PlatformFor returns the Platform entry for the current OS/arch from a manifest.
// Returns an error if the platform is not listed in the manifest.
func (m *UpdateManifest) PlatformFor(key string) (Platform, error) {
	p, ok := m.Platforms[key]
	if !ok {
		return Platform{}, fmt.Errorf("no update available for platform %q", key)
	}
	return p, nil
}
