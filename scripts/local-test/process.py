#!/usr/bin/env python3
import os, subprocess, sys
from pathlib import Path
root = Path(__file__).resolve().parents[2]
if sys.argv[1] == 'api':
    os.environ['NODE_ENV'] = 'development'
    command = ['node', str(root / 'scripts/local-test/api.cjs')]
    cwd = root
else:
    os.environ['NODE_ENV'] = 'production'
    command = ['node', str(root / 'node_modules/next/dist/bin/next'), 'start', '--hostname', '127.0.0.1', '--port', '3102']
    cwd = root / 'apps/web'
sys.exit(subprocess.call(command, cwd=cwd))
