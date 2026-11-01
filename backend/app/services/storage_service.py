import os
import uuid
import hashlib
from typing import Tuple, List
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

    def get_candidate_dirs(self) -> List[str]:
        candidates = []
        try:
            configured = self.storage_dir or current_app.config.get('STORAGE_DIR')
            if configured:
                candidates.append(os.path.abspath(configured))
                if not os.path.isabs(configured):
                    candidates.append(configured)
        except Exception:
            pass

        # Candidate relative directories
        services_dir = os.path.dirname(os.path.abspath(__file__))
        app_dir = os.path.dirname(services_dir)
        backend_dir = os.path.dirname(app_dir)
        repo_dir = os.path.dirname(backend_dir)

        candidates.append(os.path.join(backend_dir, 'storage', 'records'))
        candidates.append(os.path.join(repo_dir, 'storage', 'records'))
        candidates.append(os.path.join(repo_dir, 'backend', 'storage', 'records'))

        cwd = os.getcwd()
        candidates.append(os.path.join(cwd, 'storage', 'records'))
        candidates.append(os.path.join(cwd, 'backend', 'storage', 'records'))

        # Standard container paths
        candidates.append('/app/storage/records')
        candidates.append('/app/backend/storage/records')

        seen = set()
        unique = []
        for c in candidates:
            norm = os.path.normpath(c)
            if norm not in seen:
                seen.add(norm)
                unique.append(norm)
        return unique

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

        # Search all candidate directories
        for d in self.get_candidate_dirs():
            candidate_path = os.path.join(d, safe_name)
            if os.path.exists(candidate_path):
                return candidate_path

        primary_dir = self._get_dir()
        path = os.path.join(primary_dir, safe_name)
        if not os.path.exists(path):
            raise FileNotFoundError(f"Stored file {safe_name} not found in candidate paths: {self.get_candidate_dirs()}")
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
