# backend/models.py
from sqlalchemy import Column, Integer, String, DateTime, Boolean
import datetime
from database import Base

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre_completo = Column(String, nullable=False)
    dni = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    distancia = Column(String, nullable=False)  # 5K, 10K, 21K
    talle_remera = Column(String, nullable=False)  # S, M, L, XL, XXL
    qr_code = Column(String, unique=True, nullable=False)
    
    # Control estricto de acreditación (Evita entregas dobles)
    acreditado = Column(Boolean, default=False)
    fecha_acreditacion = Column(DateTime, nullable=True)

class AlbumOficial(Base):
    __tablename__ = "albumes_oficiales"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String, nullable=False)
    subtitulo = Column(String, nullable=True)
    google_photos_url = Column(String, nullable=False)
    portada_url = Column(String, nullable=False)
    fecha_evento = Column(String, nullable=False)

class FotoComunidad(Base):
    __tablename__ = "fotos_comunidad"

    id = Column(Integer, primary_key=True, index=True)
    usuario_nombre = Column(String, nullable=False)
    imagen_url = Column(String, nullable=False)
    categoria = Column(String, default="General")  # Previas, Carrera, Medallas
    # Usando timezone consciente de UTC
    fecha_subida = Column(DateTime, default=lambda: datetime.datetime.now(datetime.timezone.utc))


# push_token = Column(String, nullable=True)

class RegistroCorredor(BaseModel):
    nombre_completo: str
    dni: str
    email: EmailStr
    distancia: str
    talle_remera: str
    push_token: str | None = None  # Agregamos el token opcional