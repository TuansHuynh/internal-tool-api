//go:build windows

package updater

import (
	"os/exec"
	"syscall"
)

// setSysProcAttr configures the command to run as a detached Windows process.
// This prevents the updater from being killed when the parent process exits.
func setSysProcAttr(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{
		// CREATE_NEW_PROCESS_GROUP | DETACHED_PROCESS
		CreationFlags: syscall.CREATE_NEW_PROCESS_GROUP | 0x00000008,
		HideWindow:    false,
	}
}
