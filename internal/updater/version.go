package updater

import (
	"fmt"
	"strconv"
	"strings"
)

// SemVer represents a parsed semantic version.
type SemVer struct {
	Major int
	Minor int
	Patch int
}

// ParseSemVer parses a version string like "1.2.3" or "v1.2.3".
// Returns an error if the string is not a valid semver.
func ParseSemVer(version string) (SemVer, error) {
	v := strings.TrimPrefix(strings.TrimSpace(version), "v")
	parts := strings.Split(v, ".")
	if len(parts) != 3 {
		return SemVer{}, fmt.Errorf("invalid semver %q: expected MAJOR.MINOR.PATCH", version)
	}

	major, err := strconv.Atoi(parts[0])
	if err != nil {
		return SemVer{}, fmt.Errorf("invalid major in %q: %w", version, err)
	}
	minor, err := strconv.Atoi(parts[1])
	if err != nil {
		return SemVer{}, fmt.Errorf("invalid minor in %q: %w", version, err)
	}
	patch, err := strconv.Atoi(parts[2])
	if err != nil {
		return SemVer{}, fmt.Errorf("invalid patch in %q: %w", version, err)
	}

	return SemVer{Major: major, Minor: minor, Patch: patch}, nil
}

// IsNewerThan returns true if v is strictly newer than other.
// E.g. SemVer{1,10,0}.IsNewerThan(SemVer{1,9,0}) == true
func (v SemVer) IsNewerThan(other SemVer) bool {
	if v.Major != other.Major {
		return v.Major > other.Major
	}
	if v.Minor != other.Minor {
		return v.Minor > other.Minor
	}
	return v.Patch > other.Patch
}

// String returns the "MAJOR.MINOR.PATCH" representation.
func (v SemVer) String() string {
	return fmt.Sprintf("%d.%d.%d", v.Major, v.Minor, v.Patch)
}

// IsNewerVersionString compares two version strings and returns true if
// latestVersion is strictly newer than currentVersion.
// Returns false (not an error) on parse failure so the caller can log and continue.
func IsNewerVersionString(currentVersion, latestVersion string) (bool, error) {
	current, err := ParseSemVer(currentVersion)
	if err != nil {
		return false, fmt.Errorf("parse current version: %w", err)
	}
	latest, err := ParseSemVer(latestVersion)
	if err != nil {
		return false, fmt.Errorf("parse latest version: %w", err)
	}
	return latest.IsNewerThan(current), nil
}
