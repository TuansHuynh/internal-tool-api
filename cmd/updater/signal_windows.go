//go:build windows

package main

import (
	"os"
	"syscall"
	"time"

	"golang.org/x/sys/windows"
)

// syscallSignal is unused on Windows; waitForProcessExitFn is overridden by init().
func syscallSignal(sig syscall.Signal) syscall.Signal {
	return sig
}

const (
	waitObject0  uint32 = 0x00000000
	waitTimeout  uint32 = 0x00000102
)

func init() {
	// Replace the cross-platform polling implementation with the Windows API version.
	waitForProcessExitFn = winWaitForExit
}

func winWaitForExit(pid int, timeout time.Duration) error {
	handle, err := windows.OpenProcess(windows.SYNCHRONIZE, false, uint32(pid))
	if err != nil {
		// Process not found — already exited.
		return nil
	}
	defer windows.CloseHandle(handle)

	ms := uint32(timeout.Milliseconds())
	result, _ := windows.WaitForSingleObject(handle, ms)
	switch result {
	case waitObject0:
		return nil // Process exited cleanly.
	case waitTimeout:
		return os.ErrDeadlineExceeded
	default:
		return os.ErrInvalid
	}
}
