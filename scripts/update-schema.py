#!/usr/bin/env python3
import os, sys, subprocess, shutil, glob, errno, os.path

def call(cmd: str, env = None, silent = False):
    return bool(subprocess.call(
        cmd.split(" "), 
        env=env,
        stdout=sys.stdout if not silent else subprocess.DEVNULL))

def try_call(cmd: str, env = None, silent = False):
    try: return call(cmd, env, silent)
    except: return False

# Taken from https://stackoverflow.com/a/23794010/11953579
def mkdir_p(path):
    try:
        os.makedirs(path)
    except OSError as exc: # Python >2.5
        if exc.errno == errno.EEXIST and os.path.isdir(path):
            pass
        else: raise

def safe_open_w(path):
    ''' Open "path" for writing, creating any parent directories as needed.
    '''
    mkdir_p(os.path.dirname(path))
    return open(path, 'w')

print("Checking for packetc")
ec = try_call("packetc --help", silent=True)
if ec != 0:
    print("Installing packetc...")
    call("cargo install --git https://github.com/EverCrawl/packetc.git")

call("git remote update")
call("git submodule update --recursive")

print("Updating schemas")
os.chdir("schemas")
call("git fetch --all")
call("git checkout master")
call("git pull origin master")
os.chdir("..")

print("Deleting old schemas")
if os.path.exists("src/schemas") and os.path.isdir("src/schemas"):
    shutil.rmtree("src/schemas")

print("Compiling schemas")
call("packetc ts schemas src/schemas")

# all the compiled schemas in src/schemas need to be re-exported
print("Collecting compiled schemas")
index = ""
for file in glob.glob("src/schemas/*.ts"):
    filename = os.path.splitext(os.path.basename(file))[0]
    export = filename.title()
    index += f"export * as {export} from \"./{filename}\";\n"
print("Writing src/schemas/index.ts")
with safe_open_w("src/schemas/index.ts") as f:
    f.write(index)
