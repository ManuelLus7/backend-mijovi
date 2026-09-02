import os
import datetime
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from dotenv import load_dotenv

import models
from database import engine, SessionLocal

# Cargar variables de entorno
load_dotenv()

# Crear tablas automáticamente
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="API Maratón Mijovi S.R.L.")

# Configuración de Mail
mail_config = ConnectionConfig(
    MAIL_USERNAME=os.getenv("MAIL_USERNAME", "usuario@gmail.com"),
    MAIL_PASSWORD=os.getenv("MAIL_PASSWORD", "password"),
    MAIL_FROM=os.getenv("MAIL_FROM", "no-reply@maratonmijovi.com"),
    MAIL_PORT=int(os.getenv("MAIL_PORT", 587)),
    MAIL_SERVER=os.getenv("MAIL_SERVER", "smtp.gmail.com"),
    MAIL_STARTTLS=True,
    MAIL_SSL_TLS=False,
    USE_CREDENTIALS=True,
    VALIDATE_CERTS=True
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# SCHEMAS DE VALIDACIÓN
class RegistroCorredor(BaseModel):
    nombre_completo: str
    dni: str
    email: EmailStr
    distancia: str
    talle_remera: str

class ValidarQRRequest(BaseModel):
    qr_code: str

class AlbumOficialCreate(BaseModel):
    titulo: str
    subtitulo: Optional[str] = None
    google_photos_url: str
    portada_url: str
    fecha_evento: str

class FotoSubidaRequest(BaseModel):
    usuario_nombre: str
    imagen_url: str
    categoria: Optional[str] = "General"

# ENVIAR CORREO EN SEGUNDO PLANO
async def enviar_correo_confirmacion(email_destino: str, nombre: str, dni: str, distancia: str, qr_code: str, talle: str):
    qr_image_url = f"https://quickchart.io/qr?text={qr_code}&size=200"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden;">
            <div style="background-color: #000000; padding: 20px; text-align: center;">
                <h1 style="color: #F15A24; margin: 0;">MARATÓN MIJOVI 2027</h1>
            </div>
            <div style="padding: 30px; text-align: center;">
                <h2>¡Inscripción Confirmada! 🎉</h2>
                <p>Hola <strong>{nombre}</strong>, tu registro se completó con éxito.</p>
                
                <div style="background-color: #f9f9f9; border-left: 4px solid #F15A24; padding: 15px; text-align: left; margin: 20px 0;">
                    <p><strong>DNI:</strong> {dni}</p>
                    <p><strong>Distancia:</strong> {distancia}</p>
                    <p><strong>Talle:</strong> {talle}</p>
                    <p><strong>Código Pase:</strong> {qr_code}</p>
                </div>

                <p style="font-weight: bold;">Tu QR de Acreditación:</p>
                <img src="{qr_image_url}" alt="QR Acreditación" style="width: 180px; height: 180px; border: 1px solid #ddd; padding: 5px; border-radius: 8px;">
            </div>
        </div>
    </body>
    </html>
    """

    message = MessageSchema(
        subject=f"🏁 Inscripción Confirmada - Maratón Mijovi ({distancia})",
        recipients=[email_destino],
        body=html_content,
        subtype=MessageType.html
    )

    fastmail = FastMail(mail_config)
    try:
        await fastmail.send_message(message)
    except Exception as e:
        print(f"Error enviando correo a {email_destino}: {e}")

# ENDPOINTS
@app.post("/api/registro", status_code=status.HTTP_201_CREATED)
def registrar_corredor(corredor: RegistroCorredor, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    if db.query(models.Usuario).filter(models.Usuario.dni == corredor.dni).first():
        raise HTTPException(status_code=400, detail="El DNI ya se encuentra registrado.")
    
    if db.query(models.Usuario).filter(models.Usuario.email == corredor.email).first():
        raise HTTPException(status_code=400, detail="El correo electrónico ya se encuentra registrado.")
    
    qr_generado = f"MIJOVI-{corredor.dni}-{corredor.distancia}"
    
    nuevo_usuario = models.Usuario(
        nombre_completo=corredor.nombre_completo,
        dni=corredor.dni,
        email=corredor.email,
        distancia=corredor.distancia,
        talle_remera=corredor.talle_remera,
        qr_code=qr_generado,
        acreditado=False
    )
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)

    background_tasks.add_task(
        enviar_correo_confirmacion,
        email_destino=corredor.email,
        nombre=corredor.nombre_completo,
        dni=corredor.dni,
        distancia=corredor.distancia,
        qr_code=qr_generado,
        talle=corredor.talle_remera
    )

    return {"mensaje": "Inscripción exitosa.", "qr_code": qr_generado, "id": nuevo_usuario.id}

@app.get("/api/corredor/dni/{dni}")
def buscar_inscripcion(dni: str, db: Session = Depends(get_db)):
    corredor = db.query(models.Usuario).filter(models.Usuario.dni == dni).first()
    if not corredor:
        raise HTTPException(status_code=404, detail="Inscripción no encontrada.")
    return corredor

@app.post("/api/admin/acreditar")
def acreditar_corredor(payload: ValidarQRRequest, db: Session = Depends(get_db)):
    corredor = db.query(models.Usuario).filter(models.Usuario.qr_code == payload.qr_code).first()
    if not corredor:
        raise HTTPException(status_code=404, detail="Código QR no válido.")
    
    if corredor.acreditado:
        fecha_str = corredor.fecha_acreditacion.strftime('%d/%m/%Y a las %H:%M') if corredor.fecha_acreditacion else "previamente"
        raise HTTPException(status_code=400, detail=f"⚠️ El kit de {corredor.nombre_completo} YA FUE ENTREGADO el {fecha_str} hs.")
    
    corredor.acreditado = True
    corredor.fecha_acreditacion = datetime.datetime.now()
    db.commit()
    
    return {"status": "exito", "mensaje": "✅ Kit Acreditado y Entregado", "corredor": {"nombre": corredor.nombre_completo, "dni": corredor.dni}}

@app.get("/api/admin/corredores")
def listar_todos_corredores(db: Session = Depends(get_db)):
    return db.query(models.Usuario).all()

# --- ÁLBUMES OFICIALES (GOOGLE PHOTOS) ---
@app.get("/api/albumes-oficiales")
def obtener_albumes_oficiales(db: Session = Depends(get_db)):
    return db.query(models.AlbumOficial).all()

@app.post("/api/admin/albumes-oficiales", status_code=status.HTTP_201_CREATED)
def crear_album_oficial(album: AlbumOficialCreate, db: Session = Depends(get_db)):
    nuevo_album = models.AlbumOficial(**album.dict())
    db.add(nuevo_album)
    db.commit()
    db.refresh(nuevo_album)
    return nuevo_album

# --- MURO COMUNITARIO ---
@app.post("/api/fotos", status_code=status.HTTP_201_CREATED)
def subir_foto(foto: FotoSubidaRequest, db: Session = Depends(get_db)):
    nueva_foto = models.FotoComunidad(
        usuario_nombre=foto.usuario_nombre,
        imagen_url=foto.imagen_url,
        categoria=foto.categoria
    )
    db.add(nueva_foto)
    db.commit()
    db.refresh(nueva_foto)
    return {"mensaje": "Foto publicada", "id": nueva_foto.id}

@app.get("/api/fotos")
def obtener_fotos(categoria: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.FotoComunidad)
    if categoria and categoria != "Todos":
        query = query.filter(models.FotoComunidad.categoria == categoria)
    return query.order_by(models.FotoComunidad.fecha_subida.desc()).all()

@app.get("/api/kpis")
def obtener_kpis(db: Session = Depends(get_db)):
    total = db.query(models.Usuario).count()
    acreditados = db.query(models.Usuario).filter(models.Usuario.acreditado.is_(True)).count()
    k5 = db.query(models.Usuario).filter(models.Usuario.distancia == "5K").count()
    k10 = db.query(models.Usuario).filter(models.Usuario.distancia == "10K").count()
    k21 = db.query(models.Usuario).filter(models.Usuario.distancia == "21K").count()
    
    return {
        "total_inscriptos": total,
        "total_acreditados": acreditados,
        "pendientes_kit": total - acreditados,
        "distribucion": {"5K": k5, "10K": k10, "21K": k21}
    }