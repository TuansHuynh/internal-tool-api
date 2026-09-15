package main

import (
	"flag"
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"runtime"
	"time"
)

// waitForProcessExitFn can be swapped by OS-specific init() functions.
// Default is a cross-platform polling implementation.
var waitForProcessExitFn = waitForProcessExitPolling

func main() {
	pid := flag.Int("pid", 0, "PID of the application to wait for")
	source := flag.String("source", "", "Path to the downloaded new binary")
	target := flag.String("target", "", "Path to the current application executable")
	newTarget := flag.String("new-target", "", "Path to the new renamed executable file (optional, defaults to target)")
	flag.Parse()

	if *pid == 0 || *source == "" || *target == "" {
		log.Fatal("[updater] missing required flags: --pid, --source, --target")
	}

	finalTarget := *target
	if *newTarget != "" {
		finalTarget = *newTarget
	}

	logf("[updater] starting — waiting for app PID=%d to exit (target=%s, newTarget=%s)", *pid, *target, finalTarget)

	// ── Step 1: Wait for the application to exit ────────────────────────────
	if err := waitForProcessExitFn(*pid, 60*time.Second); err != nil {
		logf("[updater] WARNING: %v — proceeding anyway", err)
	}
	logf("[updater] app process has exited")

	// Small extra pause on Windows to ensure all file handles are released.
	if runtime.GOOS == "windows" {
		time.Sleep(500 * time.Millisecond)
	}

	// ── Step 2: Backup old binary ────────────────────────────────────────────
	backup := *target + ".bak"
	logf("[updater] backing up %s → %s", *target, backup)
	if err := copyFile(*target, backup); err != nil {
		logf("[updater] ERROR: could not backup old binary: %v", err)
		os.Exit(1)
	}

	// ── Step 3: Replace / Write new binary ───────────────────────────────────
	logf("[updater] installing new binary to %s (from %s)", finalTarget, *source)
	if err := replaceFile(*source, finalTarget); err != nil {
		logf("[updater] ERROR: install failed: %v — rolling back", err)
		if finalTarget != *target {
			_ = os.Remove(finalTarget)
		}
		rollback(backup, *target)
		os.Exit(1)
	}

	// Keep previous version binary intact for historical preservation
	if finalTarget != *target {
		logf("[updater] preserved previous version binary: %s", *target)
	}

	// ── Step 4: Verify new binary ────────────────────────────────────────────
	fi, err := os.Stat(finalTarget)
	if err != nil || fi.Size() == 0 {
		logf("[updater] ERROR: target file invalid after install — rolling back")
		if finalTarget != *target {
			_ = os.Remove(finalTarget)
		}
		rollback(backup, *target)
		os.Exit(1)
	}

	// ── Step 5: Set executable permission (Linux/macOS) ──────────────────────
	if runtime.GOOS != "windows" {
		if err = os.Chmod(finalTarget, 0o755); err != nil {
			logf("[updater] WARNING: chmod %s: %v", finalTarget, err)
		}
	}

	// ── Step 6: Restart application ──────────────────────────────────────────
	logf("[updater] launching updated app: %s", finalTarget)
	cmd := exec.Command(finalTarget)
	if err = cmd.Start(); err != nil {
		logf("[updater] ERROR: could not start new app: %v — rolling back", err)
		if finalTarget != *target {
			_ = os.Remove(finalTarget)
		}
		rollback(backup, *target)
		os.Exit(1)
	}
	logf("[updater] new app started (PID=%d)", cmd.Process.Pid)

	// ── Step 7: Cleanup ──────────────────────────────────────────────────────
	_ = os.Remove(backup)
	_ = os.Remove(*source)
	logf("[updater] cleanup done — exiting")
}

// waitForProcessExitPolling is the default cross-platform implementation.
// It polls at 200ms intervals until the process is gone or timeout elapses.
func waitForProcessExitPolling(pid int, timeout time.Duration) error {
	deadline := time.Now().Add(timeout)
	for time.Now().Before(deadline) {
		proc, err := os.FindProcess(pid)
		if err != nil {
			return nil // Process not found — already gone.
		}
		// On Unix, Signal(nil) checks liveness without disturbing the process.
		// On Windows, FindProcess always succeeds even for dead processes,
		// so the Windows init() overrides this function with a proper Wait.
		if runtime.GOOS != "windows" {
			if signalErr := proc.Signal(syscallSignal(0)); signalErr != nil {
				return nil
			}
		}
		time.Sleep(200 * time.Millisecond)
	}
	return fmt.Errorf("timed out waiting for PID %d to exit after %s", pid, timeout)
}

// replaceFile copies src to dst.
// On Windows this is safe because the old process has fully exited.
func replaceFile(src, dst string) error {
	return copyFile(src, dst)
}

// copyFile copies src to dst using streaming I/O with retries for temporary file locks.
func copyFile(src, dst string) error {
	var lastErr error
	for attempt := 1; attempt <= 10; attempt++ {
		err := func() error {
			in, err := os.Open(src)
			if err != nil {
				return fmt.Errorf("open source: %w", err)
			}
			defer in.Close()

			out, err := os.Create(dst)
			if err != nil {
				return fmt.Errorf("create destination: %w", err)
			}
			defer out.Close()

			if _, err = io.Copy(out, in); err != nil {
				return fmt.Errorf("copy: %w", err)
			}
			return out.Sync()
		}()

		if err == nil {
			return nil
		}
		lastErr = err
		time.Sleep(300 * time.Millisecond)
	}
	return fmt.Errorf("failed after 10 attempts: %w", lastErr)
}

// rollback replaces target with the backup file. Best-effort.
func rollback(backup, target string) {
	logf("[updater] rolling back: %s → %s", backup, target)
	if err := copyFile(backup, target); err != nil {
		logf("[updater] CRITICAL: rollback failed: %v — app may be broken!", err)
		return
	}
	logf("[updater] rollback successful")
}

func logf(format string, args ...any) {
	log.Printf(format, args...)
}
