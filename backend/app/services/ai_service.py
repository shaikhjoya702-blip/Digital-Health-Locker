import json
import logging
from typing import Dict, Any
from flask import current_app

logger = logging.getLogger(__name__)

class AIService:
    """
    AI-Assisted Medical Report Summarizer using Google Gemini API.
    Strictly follows medical grounding principles:
    - Never fabricates diagnoses or prescribes treatments.
    - Highlights reported values directly from source text.
    - Explicitly marks missing, illegible, or uncertain values.
    - Includes medical disclaimers.
    """

    SYSTEM_PROMPT = """
You are an expert Clinical Health Communicator inside the "Digital Health Locker" EHR system.
Your mission is to bridge the gap between complex laboratory data and the patient, translating their lab findings into a warm, empathetic, humanized, and beautifully structured health breakdown.

CRITICAL MEDICAL & SAFETY PRINCIPLES:
1. STRICT GROUNDING: Never hallucinate, guess, or extrapolate numeric biomarker values not present in the provided report text.
2. NO UNILATERAL DIAGNOSES OR PRESCRIPTIONS: Explain what markers mean and their clinical significance, but do not state definitive medical diagnoses or prescribe pharmaceutical regimens.
3. CLEAR CATEGORIZATION: Explicitly distinguish between optimal/normal findings, borderline or out-of-range parameters, and ambiguous items.
4. CLINICAL PERSPECTIVE: Provide a holistic, thoughtful "AI Clinical Perspective" connecting how the biomarkers interact (e.g. how blood lipids, fasting glucose, or liver enzymes correlate with overall health), along with lifestyle factors (hydration, stress, nutrition) that influence them.
5. PHYSICIAN CONVERSATION GUIDE: Provide 3 to 5 clear, high-value questions the patient should ask their primary care doctor during their consultation.

JSON OUTPUT FORMAT (Valid, parseable JSON strictly):
{
  "document_type": "Blood Test / Lipid Panel / Metabolic Panel / Pathology / Radiology / Other",
  "document_date": "YYYY-MM-DD or Not Stated",
  "overall_status": "Optimal & Within Normal Limits / Stable with Mild Flags / Follow-up Recommended / Needs Clinical Review",
  "summary_text": "An empathetic, plain-language 2-3 paragraph overview explaining what test was conducted, what systems were checked, and what the results generally indicate.",
  "key_findings": [
    {
      "parameter": "Name of biomarker (e.g. Hemoglobin, Fasting Blood Glucose, hs-CRP)",
      "observed_value": "Value exactly as in report (e.g. 13.5 g/dL)",
      "reference_range": "Reference range (e.g. 12.0 - 15.5 g/dL) or Not Provided",
      "interpretation": "Optimal / Normal / Elevated / Below Target / Borderline",
      "significance": "1 friendly sentence explaining what this specific test measures for the body."
    }
  ],
  "ai_perspective": "A deeply thoughtful, humanized clinical perspective: explain how the findings fit together holistically, why minor variations occur, relevant lifestyle considerations (sleep, diet, physical activity), and what the numbers tell about overall vitality without inducing panic.",
  "questions_for_doctor": [
    "What specific follow-up or re-testing timeline do you recommend for any borderline values?",
    "Could my recent diet, exercise, or fasting state have influenced these findings?",
    "Are there targeted lifestyle or nutritional adjustments that could optimize these markers?"
  ],
  "missing_or_unclear_info": "Any values or text in the report that were cut off, ambiguous, or illegible.",
  "patient_advice_note": "A warm, encouraging closing reminder prioritizing their doctor's guidance."
}
"""

    @classmethod
    def summarize_report(cls, raw_text: str, document_title: str) -> Dict[str, Any]:
        """
        Invokes Gemini API with extracted document text and returns structured summary.
        """
        api_key = current_app.config.get('GEMINI_API_KEY')
        model_name = current_app.config.get('AI_MODEL_NAME', 'gemini-1.5-flash')

        if not raw_text or len(raw_text.strip()) < 10:
            return {
                'success': False,
                'error': 'The extracted document text is empty or too short to generate a reliable AI summary. Please check the OCR extraction tab.'
            }

        if not api_key or api_key == 'your-gemini-api-key-here':
            # Honest fallback when API key is not configured in environment
            logger.warning("GEMINI_API_KEY is not configured in backend environment.")
            return {
                'success': True,
                'is_simulated': True,
                'model_name': 'Mock-Grounding-Engine',
                'summary_text': (
                    f"Notice: Gemini API key is not set in backend .env file. "
                    f"This document ('{document_title}') contains {len(raw_text.split())} extracted words. "
                    f"In production with a live GEMINI_API_KEY, this section will parse specific biomarkers, "
                    f"compare them to clinical reference ranges, and generate an AI-assisted summary."
                ),
                'key_findings': [
                    {
                        "parameter": "Document Text Extracted",
                        "observed_value": f"{len(raw_text)} characters",
                        "reference_range": "N/A",
                        "interpretation": "Successfully retrieved via OCR"
                    }
                ],
                'missing_or_unclear_info': "Please configure GEMINI_API_KEY in backend/.env to enable live clinical summarization.",
                'patient_advice_note': "This summary is for informational purposes only and does not substitute for qualified medical judgment."
            }

        try:
            import requests
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
            prompt_content = f"{cls.SYSTEM_PROMPT}\n\nDocument Title: {document_title}\n\nDocument Text:\n{raw_text[:12000]}"
            payload = {
                "contents": [
                    {
                        "parts": [{"text": prompt_content}]
                    }
                ],
                "generationConfig": {
                    "response_mime_type": "application/json"
                }
            }

            resp = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=30)
            if resp.status_code != 200:
                raise RuntimeError(f"Gemini API returned status {resp.status_code}: {resp.text}")

            resp_data = resp.json()
            raw_output = resp_data['candidates'][0]['content']['parts'][0]['text']
            summary_json = json.loads(raw_output)

            return {
                'success': True,
                'is_simulated': False,
                'model_name': model_name,
                'overall_status': summary_json.get('overall_status', 'Follow-up Recommended'),
                'summary_text': summary_json.get('summary_text', ''),
                'key_findings': summary_json.get('key_findings', []),
                'ai_perspective': summary_json.get('ai_perspective', ''),
                'questions_for_doctor': summary_json.get('questions_for_doctor', []),
                'missing_or_unclear_info': summary_json.get('missing_or_unclear_info', ''),
                'patient_advice_note': summary_json.get('patient_advice_note', '')
            }
        except Exception as e:
            logger.error(f"Gemini API invocation error: {str(e)}")
            return {
                'success': False,
                'error': f"AI Service error: {str(e)}. Please retry or check your backend API key."
            }

ai_service = AIService()
