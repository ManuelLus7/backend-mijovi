import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Configuración de URL de Base de Datos
# Lee la variable de entorno DATABASE_URL (provista por Render/Supabase)
# Si no existe, utiliza SQLite local como alternativa de respaldo
SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "sqlite:///./maraton_mijovi.db"
)

# Corrección de formato para compatibilidad con SQLAlchemy cuando Render asigna postgres://
if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Inicialización del Engine según el motor utilizado
if "sqlite" in SQLALCHEMY_DATABASE_URL:
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, 
        connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, 
        pool_pre_ping=True
    )

# Generador de sesiones
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Clase base declarativa para modelos
Base = declarative_base()