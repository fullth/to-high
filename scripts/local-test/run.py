#!/usr/bin/env python3
"""Own only the two isolated loopback processes recorded by this launcher."""
import argparse, json, os, signal, socket, subprocess, sys, time
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
RUNTIME = Path(__file__).resolve().parent / '.runtime'
STATE = RUNTIME / 'processes.json'
ENV = {key: os.environ[key] for key in ['PATH', 'HOME', 'TMPDIR', 'LANG', 'LC_ALL', 'SYSTEMROOT'] if key in os.environ}
ENV.update(NEXT_TELEMETRY_DISABLED='1', NODE_ENV='development', NEXT_PUBLIC_API_URL='http://127.0.0.1:3999', TO_HIGH_LLM_DAILY_REQUEST_LIMIT='100')
def state():
    return json.loads(STATE.read_text()) if STATE.exists() else {}
def listening(port):
    with socket.socket() as s:
        return s.connect_ex(('127.0.0.1', port)) == 0
def owned(item):
    try:
        return os.getpgid(item['pid']) == item['pid'] and item['marker'] in subprocess.check_output(['ps', '-p', str(item['pid']), '-o', 'command='], text=True)
    except (ProcessLookupError, subprocess.CalledProcessError):
        return False
def stop():
    items = state()
    for name, item in items.items():
        if owned(item):
            os.killpg(item['pid'], signal.SIGTERM)
            print(f'Stopped local {name}')
    if STATE.exists(): STATE.unlink()
def build():
    RUNTIME.mkdir(parents=True, exist_ok=True)
    for name, command, cwd in [('api', ['npm','run','build:api'], ROOT), ('web', ['node',str(ROOT/'node_modules/next/dist/bin/next'),'build','--webpack'], ROOT/'apps/web')]:
        with (RUNTIME/f'{name}-build.log').open('w') as log:
            build_env = {**ENV, "NODE_ENV": "production" if name == "web" else "development"}
            result = subprocess.run(command,cwd=cwd,env=build_env,stdout=log,stderr=log)
        if result.returncode: raise RuntimeError(f'{name} build failed; inspect {RUNTIME}/{name}-build.log')
        print(f'{name} build passed', flush=True)
    (RUNTIME/'build-target.json').write_text(json.dumps({'webBuildId': (ROOT/'apps/web/.next/BUILD_ID').read_text().strip(), 'apiUrl': ENV['NEXT_PUBLIC_API_URL']}))
def start(rebuild):
    RUNTIME.mkdir(parents=True,exist_ok=True)
    items = state()
    if items and all(owned(item) for item in items.values()) and all(listening(p) for p in [3999,3102]):
        print('Already running: http://127.0.0.1:3102/talk'); return
    if any(listening(p) for p in [3999,3102]):
        raise RuntimeError('Port 3999 or 3102 is in use. Existing processes were preserved; stop only your own preview before retrying.')
    if rebuild: build()
    if not (ROOT/'apps/api/dist/controller/ephemeral/ephemeral.controller.js').exists() or not (ROOT/'apps/web/.next/BUILD_ID').exists():
        raise RuntimeError('Builds missing. Run start --build first.')
    marker_file = RUNTIME/'build-target.json'
    if not marker_file.exists() or json.loads(marker_file.read_text()).get('webBuildId') != (ROOT/'apps/web/.next/BUILD_ID').read_text().strip():
        raise RuntimeError('Local API target not verified for this build. Run restart --build.')
    specs = [(name, [sys.executable, str(ROOT/'scripts/local-test/process.py'), name], ROOT, 'scripts/local-test/process.py') for name in ['api','web']]
    items = {}
    for name, command, cwd, marker in specs:
        with (RUNTIME/f'{name}.log').open('a') as log:
            process = subprocess.Popen(command,cwd=cwd,env=ENV,stdout=log,stderr=log,start_new_session=True)
        items[name] = dict(pid=process.pid,marker=marker)
    STATE.write_text(json.dumps(items,indent=2))
    for _ in range(100):
        if all(listening(p) for p in [3999,3102]):
            print('Ready: http://127.0.0.1:3102/ | http://127.0.0.1:3102/talk | http://127.0.0.1:3999/health'); return
        if not all(owned(item) for item in items.values()):
            stop(); raise RuntimeError(f'Local server exited. Inspect body-free logs in {RUNTIME}')
        time.sleep(.1)
    stop(); raise RuntimeError('Local start timed out')
parser=argparse.ArgumentParser()
parser.add_argument('action',choices=['start','stop','restart','status'])
parser.add_argument('--build',action='store_true')
args=parser.parse_args()
try:
    if args.action in ['stop','restart']: stop()
    if args.action in ['start','restart']: start(args.build)
    if args.action=='status':
        print(json.dumps({'processes':{k:{'pid':v['pid'],'owned':owned(v)} for k,v in state().items()},'webListening':listening(3102),'apiListening':listening(3999)},indent=2))
except Exception as error:
    print(str(error),file=sys.stderr);sys.exit(1)
