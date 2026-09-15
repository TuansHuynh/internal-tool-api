//go:build !windows

package updater

import (
	"os/exec"
	"syscall"
)

// setSysProcAttr configures the command to run in a new process group on Unix.
func setSysProcAttr(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{
		Setpgid: true,
	}
}
