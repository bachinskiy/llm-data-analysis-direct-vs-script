"""Regression checks for selection-manifest portability; no model calls."""
import gzip
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import verify


class SelectionProvenanceTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        (self.root / 'B').mkdir()
        self.manifest = verify.load(verify.ROOT / 'B' / 'source_manifest.json')
        (self.root / 'B' / 'source_manifest.json').write_text(
            json.dumps(self.manifest), encoding='utf-8')
        self.path = self.root / 'B' / self.manifest['selection_provenance_file']
        self.lf = (verify.ROOT / 'B' / self.manifest['selection_provenance_file']).read_bytes().replace(b'\r\n', b'\n')
        with gzip.open(verify.ROOT / 'B' / 'input.jsonl.gz', 'rt', encoding='utf-8') as stream:
            self.rows = [json.loads(line) for line in stream if line.strip()]

    def check(self):
        with patch.object(verify, 'ROOT', self.root):
            verify.check_b_selection_provenance(self.rows)

    def test_lf_and_crlf_pass_same_manifest(self):
        for data in (self.lf, self.lf.replace(b'\n', b'\r\n')):
            with self.subTest(crlf=b'\r\n' in data):
                self.path.write_bytes(data)
                self.check()

    def test_changed_value_fails_checksum(self):
        self.path.write_bytes(self.lf.replace(b'Derailment', b'Other', 1))
        with self.assertRaisesRegex(AssertionError, 'checksum mismatch'):
            self.check()

    def test_removed_row_fails_checksum(self):
        self.path.write_bytes(self.lf.split(b'\n', 1)[1])
        with self.assertRaisesRegex(AssertionError, 'checksum mismatch'):
            self.check()

    def test_other_whitespace_is_not_normalized(self):
        self.path.write_bytes(self.lf.replace(b'Derailment', b'Derailment ', 1))
        with self.assertRaisesRegex(AssertionError, 'checksum mismatch'):
            self.check()


if __name__ == '__main__':
    unittest.main()
