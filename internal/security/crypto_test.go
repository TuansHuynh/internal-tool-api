package security

import (
	"testing"
)

func TestEncryptDecryptString(t *testing.T) {
	cases := []string{
		"super-secret-api-key-12345!@#$",
		"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
		"",
		"Tiếng Việt có dấu: Xin chào Việt Nam 🚀",
		"{\"apiKey\": \"secret\", \"password\": \"p@ssw0rd\"}",
	}

	for _, original := range cases {
		encrypted, err := EncryptString(original)
		if err != nil {
			t.Fatalf("EncryptString(%q) failed: %v", original, err)
		}

		if original != "" && encrypted == original {
			t.Fatalf("Ciphertext is identical to plaintext for %q", original)
		}

		decrypted, err := DecryptString(encrypted)
		if err != nil {
			t.Fatalf("DecryptString(%q) failed: %v", encrypted, err)
		}

		if decrypted != original {
			t.Fatalf("Expected decrypted %q, got %q", original, decrypted)
		}
	}
}

func TestLegacyPlaintextCompatibility(t *testing.T) {
	legacy := "plain-text-token-without-prefix"
	decrypted, err := DecryptString(legacy)
	if err != nil {
		t.Fatalf("Decrypt legacy failed: %v", err)
	}
	if decrypted != legacy {
		t.Fatalf("Expected %q, got %q", legacy, decrypted)
	}
}
