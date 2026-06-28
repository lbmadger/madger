import asyncio, os, ssl
import edge_tts
import edge_tts.communicate as C
import edge_tts.voices as V

# Trust system CAs + the agent proxy's MITM CA
ctx = ssl.create_default_context()
ctx.load_verify_locations(cafile="/root/.ccr/ca-bundle.crt")
C._SSL_CTX = ctx
V._SSL_CTX = ctx

PROXY = os.environ.get("HTTPS_PROXY") or os.environ.get("https_proxy")
VOICE = "fr-FR-DeniseNeural"
RATE = "+6%"

SEGMENTS = {
 "s1": "Tu coaches. Nous, on gère tout le reste.",
 "s2": "Gérer un cabinet de coach, c'est un deuxième métier. Courir après les paiements. Faire les factures à la main. Gérer les réservations par SMS. Un planning éparpillé partout. Et jongler entre dix applications.",
 "s3": "Avec Madger, tout se gère tout seul. Tes clients réservent et paient en ligne, et toi, tu gardes le suivi. Ce mois-ci, mille deux cent quarante euros encaissés, zéro commission. À chaque paiement ou nouvelle réservation, tu es prévenu en temps réel.",
 "s4": "Tout au même endroit, et tout automatique. Réservations en ligne, paiements automatiques, factures générées toutes seules, suivi client, rappels automatiques, et zéro pour cent de commission en plan Pro.",
 "s5": "Madger. Le QG des coachs sportifs. Rejoins l'accès anticipé sur madger point app.",
}

async def one(name, text):
    kw = {"text": text, "voice": VOICE, "rate": RATE}
    if PROXY:
        kw["proxy"] = PROXY
    comm = edge_tts.Communicate(**kw)
    path = os.path.join(os.path.dirname(__file__), name + ".mp3")
    await comm.save(path)
    print(name, "->", os.path.getsize(path), "bytes")

async def main():
    for n, t in SEGMENTS.items():
        await one(n, t)

asyncio.run(main())
