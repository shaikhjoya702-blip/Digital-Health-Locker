import os
import uuid
import hashlib
from typing import Tuple
from werkzeug.utils import secure_filename
from flask import current_app

class StorageService:
    """Manages secure local document storage isolated from public web roots."""

    def __init__(self, storage_dir: str = None):
        self.storage_dir = storage_dir

    def _get_dir(self) -> str:
        d = self.storage_dir or current_app.config['STORAGE_DIR']
        os.makedirs(d, exist_ok=True)
        return d

    def save_file(self, file_storage) -> Tuple[str, str, int, str]:
        """
        Saves an uploaded file to isolated storage with a secure UUID filename.
        Returns: (stored_filename, original_filename, file_size_bytes, sha256_checksum)
        """
        original_filename = secure_filename(file_storage.filename or 'document')
        ext = ''
        if '.' in original_filename:
            ext = '.' + original_filename.rsplit('.', 1)[1].lower()

        stored_filename = f"{uuid.uuid4().hex}{ext}"
        storage_path = os.path.join(self._get_dir(), stored_filename)

        # Compute SHA-256 and calculate length while saving
        hasher = hashlib.sha256()
        file_size = 0

        file_storage.seek(0)
        with open(storage_path, 'wb') as f:
            while chunk := file_storage.read(65536):
                hasher.update(chunk)
                f.write(chunk)
                file_size += len(chunk)
        
        file_storage.seek(0)
        return stored_filename, original_filename, file_size, hasher.hexdigest()

    def get_absolute_path(self, stored_filename: str) -> str:
        """Returns the absolute file path, preventing directory traversal."""
        safe_name = os.path.basename(stored_filename)
        path = os.path.join(self._get_dir(), safe_name)
        if not os.path.exists(path):
            raise FileNotFoundError(f"Stored file {safe_name} not found.")
        return path

    def delete_file(self, stored_filename: str) -> bool:
        """Deletes a file from isolated storage."""
        try:
            path = self.get_absolute_path(stored_filename)
            if os.path.exists(path):
                os.remove(path)
            return True
        except Exception:
            return False

storage_service = StorageService()
