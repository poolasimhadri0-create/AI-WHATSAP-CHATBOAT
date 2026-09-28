import re
from app.utils.exceptions import PromptInjectionException

# Heuristic patterns that indicate obvious direct prompt injections or system prompt extraction attempts
SUSPICIOUS_PROMPT_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior)\s+instructions",
    r"disregard\s+(all\s+)?(previous|prior)\s+instructions",
    r"system\s*:\s*you\s+are",
    r"<\|im_start\|>",
    r"<\|im_end\|>",
    r"reveal\s+(the\s+)?system\s+prompt",
    r"bypass\s+(your\s+)?(safety|rules|constraints)",
]

COMPILED_PATTERNS = [re.compile(p, re.IGNORECASE) for p in SUSPICIOUS_PROMPT_PATTERNS]


def sanitize_and_validate_input(text: str, max_chars: int = 4000) -> str:
    """
    Sanitizes user input:
    1. Trims extraneous whitespace.
    2. Enforces maximum character limits.
    3. Checks against malicious jailbreak and instruction override patterns.
    """
    if not text or not text.strip():
        raise PromptInjectionException("Input prompt cannot be empty.")

    cleaned = text.strip()

    if len(cleaned) > max_chars:
        raise PromptInjectionException(f"Input exceeds maximum allowed length of {max_chars} characters.")

    # Check for direct prompt injection markers
    for pattern in COMPILED_PATTERNS:
        if pattern.search(cleaned):
            raise PromptInjectionException(
                "Input contains potentially unsafe instructions or prompt override attempts."
            )

    return cleaned
