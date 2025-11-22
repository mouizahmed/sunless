package utils

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"io"
	"os"
)

var encryptionKey []byte

// InitEncryption initializes the encryption key from environment variables
func InitEncryption() error {
	key := os.Getenv("ENCRYPTION_KEY")
	if key == "" {
		return errors.New("ENCRYPTION_KEY environment variable is required")
	}

	keyBytes, err := base64.StdEncoding.DecodeString(key)
	if err != nil {
		return errors.New("Invalid ENCRYPTION_KEY format: " + err.Error())
	}

	if len(keyBytes) != 32 {
		return errors.New("ENCRYPTION_KEY must be 32 bytes (256 bits) when base64 decoded")
	}

	encryptionKey = keyBytes
	return nil
}

// EncryptToken encrypts a token using AES-256-GCM
func EncryptToken(plaintext string) (string, error) {
	if plaintext == "" {
		return "", nil
	}

	block, err := aes.NewCipher(encryptionKey)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// DecryptToken decrypts a token using AES-256-GCM
func DecryptToken(ciphertext string) (string, error) {
	if ciphertext == "" {
		return "", nil
	}

	data, err := base64.StdEncoding.DecodeString(ciphertext)
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(encryptionKey)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	if len(data) < gcm.NonceSize() {
		return "", errors.New("ciphertext too short")
	}

	nonce, ciphertext_bytes := data[:gcm.NonceSize()], data[gcm.NonceSize():]
	plaintext, err := gcm.Open(nil, nonce, ciphertext_bytes, nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}