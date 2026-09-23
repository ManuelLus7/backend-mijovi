import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Animated, TouchableOpacity, Linking } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../colors';

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [progress] = useState(new Animated.Value(0));

  // Inicialización del reproductor de video nativo
  const videoSource = require('../assets/bienvenida/splash.mp4');
  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = true;
    p.play();
  });

  useEffect(() => {
    // Animación de la barra de carga durante 5 segundos
    Animated.timing(progress, {
      toValue: 100,
      duration: 5000,
      useNativeDriver: false,
    }).start();

    const timer = setTimeout(() => {
      onFinish();
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const widthInterpolated = progress.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const handleContactar = () => {
    const telefono = '3854935947';
    const mensaje = 'Hola Manuel, vi la aplicación de la Maratón Mijovi y me interesa cotizar un desarrollo móvil o sistema a medida para mi empresa.';
    Linking.openURL(`https://wa.me/549${telefono}?text=${encodeURIComponent(mensaje)}`);
  };

  return (
    <View style={styles.container}>
      {/* Video de fondo adaptado a la pantalla */}
      <VideoView 
        style={styles.video} 
        player={player} 
        contentFit="cover" 
        nativeControls={false} 
      />

      {/* Capa oscura para asegurar la legibilidad del texto */}
      <View style={styles.darkOverlay} />

      {/* Contenido distribuido verticalmente */}
      <View style={styles.content}>
        
        {/* BLOQUE SUPERIOR: Títulos, estado y barra de progreso */}
        <View style={styles.topSection}>
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>MARATÓN MIJOVI S.R.L.</Text>
          </View>

          <Text style={styles.title}>Plataforma Oficial de Gestión</Text>
          <Text style={styles.subtitle}>Sincronizando módulos y datos en tiempo real...</Text>

          {/* Barra de Carga Animada */}
          <View style={styles.progressBarTrack}>
            <Animated.View style={[styles.progressBarFill, { width: widthInterpolated }]} />
          </View>
        </View>

        {/* BLOQUE INFERIOR: Únicamente datos del desarrollador */}
        <TouchableOpacity style={styles.devCard} onPress={handleContactar} activeOpacity={0.9}>
          <View style={styles.devHeader}>
            <Ionicons name="code-slash" size={18} color={Colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.devName}>Desarrollado por Manuel Lus</Text>
          </View>
          <Text style={styles.devRole}>Desarrollador de Aplicaciones Móviles & Sistemas Escalables</Text>
          
          <View style={styles.contactBadge}>
            <Ionicons name="logo-whatsapp" size={15} color="#28A745" style={{ marginRight: 6 }} />
            <Text style={styles.contactText}>📲 Cel: 385 493 5947 (¡Contáctame aquí!)</Text>
          </View>
        </TouchableOpacity>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#000000' 
  },
  video: { 
    ...StyleSheet.absoluteFillObject, 
    width: '100%', 
    height: '100%' 
  },
  darkOverlay: { 
    ...StyleSheet.absoluteFillObject, 
    backgroundColor: 'rgba(0, 0, 0, 0.55)' 
  },
  content: { 
    flex: 1, 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    width: '100%', 
    paddingHorizontal: 24, 
    paddingTop: 60, 
    paddingBottom: 40, 
    zIndex: 2 
  },
  topSection: { 
    width: '100%', 
    alignItems: 'center' 
  },
  badgeContainer: { 
    backgroundColor: Colors.primary, 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 20, 
    marginBottom: 12 
  },
  badgeText: { 
    color: Colors.white, 
    fontWeight: 'bold', 
    fontSize: 11, 
    letterSpacing: 1 
  },
  title: { 
    color: Colors.white, 
    fontSize: 22, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    marginBottom: 6 
  },
  subtitle: { 
    color: '#CCCCCC', 
    fontSize: 13, 
    textAlign: 'center', 
    marginBottom: 20 
  },
  progressBarTrack: { 
    width: '100%', 
    height: 6, 
    backgroundColor: 'rgba(255,255,255,0.25)', 
    borderRadius: 3, 
    overflow: 'hidden' 
  },
  progressBarFill: { 
    height: '100%', 
    backgroundColor: Colors.primary, 
    borderRadius: 3 
  },
  devCard: { 
    backgroundColor: 'rgba(17, 17, 17, 0.92)', 
    borderWidth: 1, 
    borderColor: '#333', 
    padding: 16, 
    borderRadius: 14, 
    width: '100%', 
    alignItems: 'center' 
  },
  devHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 2 
  },
  devName: { 
    color: Colors.white, 
    fontWeight: 'bold', 
    fontSize: 15 
  },
  devRole: { 
    color: '#CCCCCC', 
    fontSize: 11, 
    textAlign: 'center', 
    marginBottom: 10 
  },
  contactBadge: { 
    backgroundColor: 'rgba(40, 167, 69, 0.18)', 
    borderWidth: 1, 
    borderColor: '#28A745', 
    paddingHorizontal: 12, 
    paddingVertical: 7, 
    borderRadius: 8, 
    flexDirection: 'row', 
    alignItems: 'center', 
    width: '100%', 
    justifyContent: 'center' 
  },
  contactText: { 
    color: Colors.white, 
    fontWeight: 'bold', 
    fontSize: 12 
  }
});