package security

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"io"
	"os"
	"runtime"
	"strings"
	"sync"
)

const (
	// encPrefix identifies ciphertext strings to allow backwards compatibility
	// with existing plaintext data in the database.
	encPrefix = "enc:v1:"

	// fixedSalt ensures key derivation stability across app restarts on the same machine.
	fixedSalt = "internal-api-client-sec-salt-8f92a4e1d3c5b706"
)

var (
	masterKeyOnce sync.Once
	masterKey     []byte
)

// getMasterKey derives a 32-byte AES-256 key tied uniquely to the local machine and user.
func getMasterKey() []byte {
	masterKeyOnce.Do(func() {
		// Gather machine & user identifiers
		hostname, _ := os.Hostname()
		userHome, _ := os.UserHomeDir()
		userConfig, _ := os.UserConfigDir()

		seed := fmt.Sprintf("%s|%s|%s|%s|%s", hostname, userHome, userConfig, runtime.GOOS, fixedSalt)
		hash := sha256.Sum256([]byte(seed))
		masterKey = hash[:]
	})
	return masterKey
}

// EncryptString encrypts a plaintext string using AES-256-GCM with a random nonce.
// Returns a prefixed Base64 string ("enc:v1:...").
// Returns empty string if plaintext is empty.
func EncryptString(plaintext string) (string, error) {
	if plaintext == "" {
		return "", nil
	}

	key := getMasterKey()
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", fmt.Errorf("create cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("create GCM: %w", err)
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err = io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("generate nonce: %w", err)
	}

	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return encPrefix + base64.StdEncoding.EncodeToString(ciphertext), nil
}

// DecryptString decrypts an encrypted string produced by EncryptString.
// If the input is not encrypted (e.g. legacy plaintext data), it returns the input as-is.
func DecryptString(data string) (string, error) {
	if data == "" {
		return "", nil
	}

	if !strings.HasPrefix(data, encPrefix) {
		// Backwards-compatibility: unencrypted legacy string
		return data, nil
	}

	b64Payload := strings.TrimPrefix(data, encPrefix)
	raw, err := base64.StdEncoding.DecodeString(b64Payload)
	if err != nil {
		return "", fmt.Errorf("decode base64: %w", err)
	}

	key := getMasterKey()
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", fmt.Errorf("create cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("create GCM: %w", err)
	}

	nonceSize := gcm.NonceSize()
	if len(raw) < nonceSize {
		return "", fmt.Errorf("ciphertext too short")
	}

	nonce, ciphertext := raw[:nonceSize], raw[nonceSize:]
	plaintextBytes, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", fmt.Errorf("decrypt GCM: %w", err)
	}

	return string(plaintextBytes), nil
}
