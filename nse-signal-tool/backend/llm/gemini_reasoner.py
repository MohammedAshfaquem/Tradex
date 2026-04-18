import os
import json
import time
from typing import Dict, Any
from dotenv import load_dotenv

# Load environment variables from project root .env
_project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
load_dotenv(os.path.join(_project_root, '.env'))

try:
    import google.generativeai as genai
    GENAI_AVAILABLE = True
    print("✅ google-generativeai library loaded successfully")
except ImportError as e:
    GENAI_AVAILABLE = False
    print(f"⚠️  google-generativeai not installed: {e}")


def analyze_signal(
    symbol: str,
    price: float,
    indicators: Dict[str, Any],
    fno_data: Dict[str, Any],
    news_headlines: list,
    ml_prob: float
) -> Dict[str, Any]:
    """
    Use Gemini LLM to analyze trading setup and provide decision.

    Returns dict with:
        - decision: BUY/SELL/SKIP/WAIT
        - reason: One sentence explanation (max 15 words)
        - risk: HIGH/MEDIUM/LOW
        - news_score: -5 to 10
    """
    neutral_response = {
        "decision": "WAIT",
        "reason": "LLM analysis unavailable",
        "risk": "MEDIUM",
        "news_score": 0,
        "error": None
    }

    # Check if LLM reasoning is enabled
    enable_llm = os.getenv("ENABLE_LLM_REASONING", "false").lower() == "true"
    if not enable_llm:
        neutral_response["error"] = "LLM reasoning disabled"
        neutral_response["reason"] = "LLM reasoning is disabled"
        return neutral_response

    # Check if API available
    if not GENAI_AVAILABLE:
        neutral_response["error"] = "google-generativeai not installed"
        print(f"❌ [{symbol}] LLM unavailable: google-generativeai not installed")
        return neutral_response

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        neutral_response["error"] = "GEMINI_API_KEY not set in .env"
        print(f"❌ [{symbol}] LLM unavailable: GEMINI_API_KEY not set")
        return neutral_response

    print(f"🤖 [{symbol}] Attempting LLM analysis with API key: {api_key[:20]}...")

    try:
        # Configure Gemini
        genai.configure(api_key=api_key)
        
        # List available models and pick the first one that supports generateContent
        try:
            available_models = genai.list_models()
            supported_models = [m for m in available_models if 'generateContent' in m.supported_generation_methods]
            
            if not supported_models:
                neutral_response["error"] = "No supported models found for this API key"
                print(f"❌ [{symbol}] No supported models found")
                return neutral_response
            
            model_name = supported_models[0].name
            print(f"🤖 [{symbol}] Available models found, using: {model_name}")
            model = genai.GenerativeModel(model_name)
            
        except Exception as list_err:
            print(f"⚠️  [{symbol}] Could not list models: {list_err}, trying gemini-pro...")
            model = genai.GenerativeModel('gemini-pro')

        # Prepare news summary
        news_summary = "No recent news"
        if news_headlines and len(news_headlines) > 0:
            news_summary = " | ".join([item['headline'][:80] for item in news_headlines[:3]])

        # Build prompt
        prompt = f"""You are an expert NSE stock trader. Analyze this trading setup and give a decision.

Stock: {symbol} | Price: ₹{price:.2f}

Technical Indicators:
- RSI: {indicators.get('rsi_value', 50)} (Score: {indicators.get('rsi_score', 0)})
- MACD: {indicators.get('macd_value', 0):.4f} (Score: {indicators.get('macd_score', 0)})
- EMA Trend: 9={indicators.get('ema9', 0):.2f}, 21={indicators.get('ema21', 0):.2f}, 50={indicators.get('ema50', 0):.2f} (Score: {indicators.get('ema_score', 0)})
- Bollinger Bands: Price at {((price - indicators.get('bb_lower', price)) / (indicators.get('bb_upper', price) - indicators.get('bb_lower', price)) * 100):.0f}% of band range (Score: {indicators.get('bb_score', 0)})

F&O Data:
- PCR: {fno_data.get('pcr', 1.0)} (Put-Call Ratio)
- OI Direction: {fno_data.get('oi_direction', 'neutral')}
- FII Net: ₹{fno_data.get('fii_net', 0):.0f} Crores
- Max Pain: ₹{fno_data.get('max_pain', 0)}

ML Model Prediction: {ml_prob:.0%} probability of price increase

Recent News: {news_summary}

Based on this analysis, respond ONLY with valid JSON in this exact format (no markdown, no code blocks):
{{"decision":"BUY/SELL/SKIP/WAIT","reason":"one sentence max 15 words","risk":"HIGH/MEDIUM/LOW","news_score": number from -5 to 10}}"""

        # Rate limiting: wait 1 second before API call
        time.sleep(1)

        # Generate response with timeout handling
        print(f"⏳ [{symbol}] Calling Gemini API...")
        response = model.generate_content(prompt)

        if not response or not response.text:
            neutral_response["error"] = "Empty response from Gemini"
            print(f"❌ [{symbol}] Empty response from Gemini")
            return neutral_response

        print(f"✅ [{symbol}] Got response from Gemini, parsing...")
        # Parse JSON response
        response_text = response.text.strip()

        # Remove markdown code blocks if present
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            response_text = "\n".join([line for line in lines if not line.startswith("```")])
            response_text = response_text.strip()

        # Try to find JSON in the response
        start_idx = response_text.find("{")
        end_idx = response_text.rfind("}") + 1

        if start_idx != -1 and end_idx > start_idx:
            json_str = response_text[start_idx:end_idx]
            result = json.loads(json_str)

            # Validate response
            if "decision" not in result or "reason" not in result:
                neutral_response["error"] = "Invalid response format"
                print(f"❌ [{symbol}] Invalid JSON format from LLM")
                return neutral_response

            # Ensure decision is valid
            valid_decisions = ["BUY", "SELL", "SKIP", "WAIT"]
            if result["decision"].upper() not in valid_decisions:
                result["decision"] = "WAIT"

            # Ensure risk is valid
            valid_risks = ["HIGH", "MEDIUM", "LOW"]
            if result.get("risk", "").upper() not in valid_risks:
                result["risk"] = "MEDIUM"

            # Clamp news score
            result["news_score"] = max(-5, min(10, result.get("news_score", 0)))

            result["error"] = None
            print(f"✅ [{symbol}] LLM analysis successful: {result['decision']} ({result['reason']})")
            return result

        else:
            neutral_response["error"] = "Could not parse JSON from response"
            return neutral_response

    except json.JSONDecodeError as e:
        neutral_response["error"] = f"JSON parse error: {str(e)}"
        print(f"❌ [{symbol}] JSON parse error: {e}")
        return neutral_response

    except Exception as e:
        error_str = str(e)
        
        # Check if quota exceeded (silently fail, don't spam)
        if "quota" in error_str.lower() or "429" in error_str or "ResourceExhausted" in error_str:
            neutral_response["error"] = "Free tier quota exceeded (20/day limit)"
            # Don't print full error to avoid spam
            return neutral_response
        
        neutral_response["error"] = f"LLM error: {str(e)}"
        print(f"❌ [{symbol}] LLM API error: {type(e).__name__}: {e}")
        return neutral_response


if __name__ == "__main__":
    # Test
    sample_indicators = {
        "rsi_value": 45,
        "rsi_score": 6,
        "macd_value": 0.5,
        "macd_score": 5,
        "ema9": 2500,
        "ema21": 2480,
        "ema50": 2450,
        "ema_score": 5,
        "bb_lower": 2400,
        "bb_upper": 2600,
        "bb_score": 4
    }

    sample_fno = {
        "pcr": 1.3,
        "oi_direction": "long_buildup",
        "fii_net": 600,
        "max_pain": 2500
    }

    sample_news = [
        {"headline": "Reliance Q3 earnings beat estimates", "source": "ET"},
        {"headline": "Oil prices surge affecting margins", "source": "MC"}
    ]

    result = analyze_signal(
        symbol="RELIANCE",
        price=2520,
        indicators=sample_indicators,
        fno_data=sample_fno,
        news_headlines=sample_news,
        ml_prob=0.75
    )

    print("LLM Analysis Result:")
    print(json.dumps(result, indent=2))
