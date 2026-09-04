import os
import csv
import datetime
from io import StringIO
from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
from dotenv import load_dotenv

import models
from database import engine, SessionLocal

load_dotenv()
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="API Maratón Mijovi S.R.L.")

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

class RegistroCorredor(BaseModel):
    nombre_completo: str
    dni: str
    email: EmailStr
    distancia: str
    talle_remera: str

class ValidarQRRequest(BaseModel):
    qr_code: str

class FotoSubidaRequest(BaseModel):
    usuario_nombre: str
    imagen_url: str
    categoria: str = "General"

class CambiarDistanciaRequest(BaseModel):
    dni: str
    nueva_distancia: str

async def enviar_correo_confirmacion(email_destino: str, nombre: str, dni: str, distancia: str, qr_code: str, talle: str):
    qr_image_url = f"https://quickchart.io/qr?text={qr_code}&size=200"

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
            <div style="background-color: #000000; padding: 20px; text-align: center;">
                <h1 style="color: #F15A24; margin: 0; font-size: 24px;">MARATÓN MIJOVI 2027</h1>
            </div>
            <div style="padding: 30px; text-align: center;">
                <h2 style="color: #333333; margin-top: 0;">¡Inscripción Confirmada! 🎉</h2>
                <p style="color: #666666; font-size: 16px;">Hola <strong>{nombre}</strong>, tu registro se completó con éxito.</p>
                <div style="background-color: #f9f9f9; border-left: 4px solid #F15A24; padding: 15px; text-align: left; margin: 20px 0;">
                    <p style="margin: 5px 0; color: #333;"><strong>DNI:</strong> {dni}</p>
                    <p style="margin: 5px 0; color: #333;"><strong>Distancia:</strong> {distancia}</p>
                    <p style="margin: 5px 0; color: #333;"><strong>Talle de Remera:</strong> {talle}</p>
                    <p style="margin: 5px 0; color: #333;"><strong>Código Pase:</strong> {qr_code}</p>
                </div>
                <p style="color: #333; font-weight: bold;">Tu Código QR de Acreditación:</p>
                <img src="{qr_image_url}" alt="Código QR Acreditación" style="width: 180px; height: 180px; border: 2px solid #ddd; padding: 5px; border-radius: 8px; margin-bottom: 15px;">
                <p style="color: #888888; font-size: 13px;">Presenta este código QR desde tu celular o impreso el día del retiro de kits.</p>
            </div>
            <div style="background-color: #f4f4f4; padding: 15px; text-align: center; color: #888888; font-size: 12px;">
                Mijovi S.R.L. © 2027 - Todos los derechos reservados.
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
        print(f"Error al enviar correo a {email_destino}: {e}")

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
        raise HTTPException(status_code=404, detail="Inscripción no encontrada para este DNI.")
    return corredor

@app.put("/api/corredor/cambiar-distancia")
def cambiar_distancia_corredor(payload: CambiarDistanciaRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    corredor = db.query(models.Usuario).filter(models.Usuario.dni == payload.dni).first()
    if not corredor:
        raise HTTPException(status_code=404, detail="Inscripción no encontrada.")
    if corredor.acreditado:
        raise HTTPException(status_code=400, detail="⚠️ No es posible cambiar la distancia: Kit ya entregado.")
    if corredor.distancia == payload.nueva_distancia:
        raise HTTPException(status_code=400, detail="Ya estás inscripto en esta categoría.")
    
    corredor.distancia = payload.nueva_distancia
    corredor.qr_code = f"MIJOVI-{corredor.dni}-{payload.nueva_distancia}"
    db.commit()
    db.refresh(corredor)

    background_tasks.add_task(
        enviar_correo_confirmacion,
        email_destino=corredor.email,
        nombre=corredor.nombre_completo,
        dni=corredor.dni,
        distancia=corredor.distancia,
        qr_code=corredor.qr_code,
        talle=corredor.talle_remera
    )

    return {"status": "exito", "mensaje": f"Categoría actualizada a {corredor.distancia}.", "corredor": corredor}

@app.post("/api/admin/acreditar")
def acreditar_corredor(payload: ValidarQRRequest, db: Session = Depends(get_db)):
    corredor = db.query(models.Usuario).filter(models.Usuario.qr_code == payload.qr_code).first()
    if not corredor:
        raise HTTPException(status_code=404, detail="Código QR no válido.")
    if corredor.acreditado:
        fecha_str = corredor.fecha_acreditacion.strftime('%d/%m/%Y %H:%M') if corredor.fecha_acreditacion else "previamente"
        raise HTTPException(status_code=400, detail=f"⚠️ ¡ALERTA! Kit ya entregado el {fecha_str} hs.")
    
    corredor.acreditado = True
    corredor.fecha_acreditacion = datetime.datetime.now()
    db.commit()
    
    return {"status": "exito", "mensaje": "✅ Kit Entregado", "corredor": {"nombre": corredor.nombre_completo, "dni": corredor.dni, "distancia": corredor.distancia, "talle": corredor.talle_remera}}

@app.post("/api/admin/acreditar-manual/{dni}")
def acreditar_manual(dni: str, db: Session = Depends(get_db)):
    corredor = db.query(models.Usuario).filter(models.Usuario.dni == dni).first()
    if not corredor:
        raise HTTPException(status_code=404, detail="Corredor no encontrado.")
    if corredor.acreditado:
        raise HTTPException(status_code=400, detail="Este kit ya fue entregado.")
    
    corredor.acreditado = True
    corredor.fecha_acreditacion = datetime.datetime.now()
    db.commit()
    return {"mensaje": f"✅ Kit de {corredor.nombre_completo} acreditado manualmente."}

@app.get("/api/admin/corredores")
def listar_todos_corredores(db: Session = Depends(get_db)):
    corredores = db.query(models.Usuario).all()
    return [
        {
            "id": c.id,
            "nombre_completo": c.nombre_completo,
            "dni": c.dni,
            "email": c.email,
            "distancia": c.distancia,
            "talle_remera": c.talle_remera,
            "qr_code": c.qr_code,
            "acreditado": bool(c.acreditado) if c.acreditado is not None else False,
            "fecha_acreditacion": c.fecha_acreditacion
        }
        for c in corredores
    ]

@app.get("/api/admin/exportar-csv")
def exportar_csv_corredores(db: Session = Depends(get_db)):
    corredores = db.query(models.Usuario).all()
    f = StringIO()
    writer = csv.writer(f)
    writer.writerow(["ID", "Nombre Completo", "DNI", "Email", "Distancia", "Talle Remera", "QR Code", "Acreditado", "Fecha Acreditacion"])
    
    for c in corredores:
        writer.writerow([
            c.id, c.nombre_completo, c.dni, c.email, 
            c.distancia, c.talle_remera, c.qr_code, 
            "SI" if c.acreditado else "NO", 
            c.fecha_acreditacion.strftime('%Y-%m-%d %H:%M:%S') if c.fecha_acreditacion else ""
        ])
    
    f.seek(0)
    response = StreamingResponse(iter([f.getvalue()]), media_type="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=corredores_maraton_mijovi.csv"
    return response

@app.get("/api/fotos")
def obtener_fotos(db: Session = Depends(get_db)):
    return db.query(models.FotoComunidad).order_by(models.FotoComunidad.fecha_subida.desc()).all()

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

@app.delete("/api/fotos/{foto_id}")
def eliminar_foto(foto_id: int, db: Session = Depends(get_db)):
    foto = db.query(models.FotoComunidad).filter(models.FotoComunidad.id == foto_id).first()
    if not foto:
        raise HTTPException(status_code=404, detail="Foto no encontrada")
    db.delete(foto)
    db.commit()
    return {"mensaje": "Foto eliminada con éxito"}

@app.get("/api/kpis")
def obtener_kpis(db: Session = Depends(get_db)):
    total = db.query(models.Usuario).count()
    acreditados = db.query(models.Usuario).filter(models.Usuario.acreditado.is_(True)).count()
    
    talles = ["S", "M", "L", "XL", "XXL"]
    inventario = {}
    for t in talles:
        sol = db.query(models.Usuario).filter(models.Usuario.talle_remera == t).count()
        ent = db.query(models.Usuario).filter(models.Usuario.talle_remera == t, models.Usuario.acreditado.is_(True)).count()
        inventario[t] = {"solicitados": sol, "entregados": ent, "pendientes": sol - ent}

    return {
        "total_inscriptos": total,
        "total_acreditados": acreditados,
        "pendientes_kit": total - acreditados,
        "control_medallas": {
            "medallas_entregadas": acreditados,
            "medallas_en_stock": max(0, 2000 - acreditados)
        },
        "distribucion": {
            "5K": db.query(models.Usuario).filter(models.Usuario.distancia == "5K").count(),
            "10K": db.query(models.Usuario).filter(models.Usuario.distancia == "10K").count(),
            "21K": db.query(models.Usuario).filter(models.Usuario.distancia == "21K").count()
        },
        "inventario_talles": inventario
    }