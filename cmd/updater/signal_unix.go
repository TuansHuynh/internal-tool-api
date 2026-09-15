//go:build !windows

package main

import "syscall"

// syscallSignal returns a syscall.Signal cast to os.Signal.
// On Unix, sending signal 0 to a process checks if it exists without actually signalling it.
func syscallSignal(sig syscall.Signal) syscall.Signal {
	return sig
}
