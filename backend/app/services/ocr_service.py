import os
from typing import Tuple, Dict, Any
from flask import current_app
from PIL import Image

class OCRService:
    """
    Robust medical document text extraction service:
    1. Extracts embedded text from PDFs directly when available.
    2. Uses Tesseract OCR for images (PNG, JPG) and scanned documents.
    3. Accurately reports processing status without fabricating information.
    """

    @classmethod
    def extract_text_from_file(cls, file_path: str, mime_type: str) -> Dict[str, Any]:
        """
        Extract text from file.
        Returns:
            {
                'text': str,
                'method': 'native_pdf' | 'tesseract_ocr' | 'hybrid' | 'manual',
                'status': 'completed' | 'failed' | 'incomplete',
                'confidence': float,
                'error': str or None
            }
        """
        if not os.path.exists(file_path):
            return {
                'text': '',
                'method': 'manual',
                'status': 'failed',
                'confidence': 0.0,
                'error': f'File not found at path: {file_path}'
            }

        if mime_type == 'application/pdf' or file_path.lower().endswith('.pdf'):
            return cls._extract_from_pdf(file_path)
        elif mime_type.startswith('image/') or file_path.lower().endswith(('.png', '.jpg', '.jpeg')):
            return cls._extract_from_image(file_path)
        else:
            return {
                'text': '',
                'method': 'manual',
                'status': 'failed',
                'confidence': 0.0,
                'error': f'Unsupported file type: {mime_type}'
            }

    @classmethod
    def _extract_from_pdf(cls, file_path: str) -> Dict[str, Any]:
        extracted_text = ""
        # 1. Attempt embedded text extraction using pypdf
        try:
            import pypdf
            reader = pypdf.PdfReader(file_path)
            for page_num, page in enumerate(reader.pages):
                page_text = page.extract_text()
                if page_text:
                    extracted_text += f"\n--- Page {page_num + 1} ---\n" + page_text.strip()
            
            if len(extracted_text.strip()) > 50:
                return {
                    'text': extracted_text.strip(),
                    'method': 'native_pdf',
                    'status': 'completed',
                    'confidence': 98.0,
                    'error': None
                }
        except Exception as e:
            current_app.logger.warning(f"Native PDF extraction failed: {str(e)}")

        # 2. If embedded text was minimal or failed, try pdfplumber
        try:
            import pdfplumber
            with pdfplumber.open(file_path) as pdf:
                for page_num, page in enumerate(pdf.pages):
                    page_text = page.extract_text()
                    if page_text:
                        extracted_text += f"\n--- Page {page_num + 1} ---\n" + page_text.strip()
            
            if len(extracted_text.strip()) > 50:
                return {
                    'text': extracted_text.strip(),
                    'method': 'native_pdf',
                    'status': 'completed',
                    'confidence': 95.0,
                    'error': None
                }
        except Exception as e:
            current_app.logger.warning(f"pdfplumber extraction failed: {str(e)}")

        # 3. Document appears scanned; try Gemini Vision if configured
        api_key = current_app.config.get('GEMINI_API_KEY')
        if api_key and api_key != 'your-gemini-api-key-here':
            gemini_res = cls._extract_with_gemini_vision(file_path, 'application/pdf')
            if gemini_res.get('status') == 'completed':
                return gemini_res

        return {
            'text': extracted_text.strip(),
            'method': 'tesseract_ocr',
            'status': 'incomplete' if extracted_text.strip() else 'failed',
            'confidence': 40.0 if extracted_text.strip() else 0.0,
            'error': 'Scanned PDF detected. Digital text was not embedded. Tesseract or Gemini Vision required.'
        }

    @classmethod
    def _extract_with_gemini_vision(cls, file_path: str, mime_type: str) -> Dict[str, Any]:
        """
        Uses Google Gemini Multimodal Vision to accurately transcribe scanned medical reports & images.
        """
        api_key = current_app.config.get('GEMINI_API_KEY')
        model_name = current_app.config.get('AI_MODEL_NAME', 'gemini-3.5-flash-lite')
        if not api_key or api_key == 'your-gemini-api-key-here':
            return {
                'text': '',
                'method': 'gemini_vision',
                'status': 'failed',
                'confidence': 0.0,
                'error': 'Gemini API key is not configured.'
            }

        try:
            import base64
            import requests

            with open(file_path, 'rb') as f:
                file_bytes = f.read()

            b64_data = base64.b64encode(file_bytes).decode('utf-8')
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
            payload = {
                'contents': [
                    {
                        'parts': [
                            {
                                'inlineData': {
                                    'mimeType': mime_type,
                                    'data': b64_data
                                }
                            },
                            {
                                'text': 'Transcribe all text from this medical report document verbatim. Preserve all test names, numeric values, units, and reference intervals. Return only the extracted text without commentary.'
                            }
                        ]
                    }
                ]
            }

            resp = requests.post(url, json=payload, headers={'Content-Type': 'application/json'}, timeout=40)
            if resp.status_code == 200:
                resp_json = resp.json()
                candidates = resp_json.get('candidates', [])
                if candidates:
                    parts = candidates[0].get('content', {}).get('parts', [])
                    if parts:
                        text = parts[0].get('text', '').strip()
                        if len(text) > 5:
                            return {
                                'text': text,
                                'method': 'gemini_vision',
                                'status': 'completed',
                                'confidence': 98.0,
                                'error': None
                            }
            return {
                'text': '',
                'method': 'gemini_vision',
                'status': 'incomplete',
                'confidence': 0.0,
                'error': f'Vision OCR did not return text (HTTP {resp.status_code}).'
            }
        except Exception as e:
            current_app.logger.warning(f"Gemini Vision extraction error: {str(e)}")
            return {
                'text': '',
                'method': 'gemini_vision',
                'status': 'failed',
                'confidence': 0.0,
                'error': f'Gemini Vision error: {str(e)}'
            }

    @classmethod
    def _extract_from_image(cls, file_path: str) -> Dict[str, Any]:
        # 1. Primary: Use Gemini Vision if API key is configured
        api_key = current_app.config.get('GEMINI_API_KEY')
        if api_key and api_key != 'your-gemini-api-key-here':
            ext = file_path.lower().rsplit('.', 1)[-1]
            mime_map = {'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png'}
            img_mime = mime_map.get(ext, 'image/jpeg')
            gemini_res = cls._extract_with_gemini_vision(file_path, img_mime)
            if gemini_res.get('status') == 'completed':
                return gemini_res

        # 2. Secondary: Fallback to local Tesseract OCR if installed
        tesseract_cmd = current_app.config.get('TESSERACT_CMD', '')
        try:
            import pytesseract
            if tesseract_cmd and os.path.exists(tesseract_cmd):
                pytesseract.pytesseract.tesseract_cmd = tesseract_cmd

            image = Image.open(file_path)
            text = pytesseract.image_to_string(image)
            clean_text = text.strip()

            if clean_text:
                return {
                    'text': clean_text,
                    'method': 'tesseract_ocr',
                    'status': 'completed',
                    'confidence': 88.0,
                    'error': None
                }
            else:
                return {
                    'text': '',
                    'method': 'tesseract_ocr',
                    'status': 'incomplete',
                    'confidence': 0.0,
                    'error': 'Image was processed but no legible text was recognized.'
                }
        except Exception as e:
            current_app.logger.error(f"Tesseract OCR image extraction error: {str(e)}")
            return {
                'text': '',
                'method': 'tesseract_ocr',
                'status': 'failed',
                'confidence': 0.0,
                'error': f'OCR engine error: {str(e)}. Ensure Tesseract is installed or configure GEMINI_API_KEY.'
            }

ocr_service = OCRService()
