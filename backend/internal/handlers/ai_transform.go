package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/mouizahmed/justscribe-backend/internal/ai"
)

type AITransformHandler struct {
	aiClient *ai.Client
}

func NewAITransformHandler(aiClient *ai.Client) *AITransformHandler {
	return &AITransformHandler{aiClient: aiClient}
}

type transformRequest struct {
	Action string `json:"action"`
	Text   string `json:"text"`
}

var transformPrompts = map[string]string{
	"improve":       "Rewrite the following text to improve clarity, flow, and word choice. Return only the improved text, no explanations.",
	"fix_grammar":   "Fix any grammar, spelling, and punctuation errors in the following text. Return only the corrected text.",
	"make_shorter":  "Condense the following text while preserving the key meaning. Return only the shorter version.",
	"make_longer":   "Expand the following text with more detail and depth. Return only the expanded version.",
	"change_tone":   "Rewrite the following text in a more professional and polished tone. Return only the rewritten text.",
}

func (h *AITransformHandler) Transform(c *gin.Context) {
	var req transformRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	if req.Text == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "text is required"})
		return
	}

	systemPrompt, ok := transformPrompts[req.Action]
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid action"})
		return
	}

	result, err := h.aiClient.Generate(c.Request.Context(), systemPrompt, req.Text)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "AI transform failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"result": result})
}
