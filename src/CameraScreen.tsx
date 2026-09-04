import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../colors';

const API_URL = 'https://backend-mijovi-production.up.railway.app';

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const cameraRef = useRef<any>(null);

  if (!permission) return <View style={styles.container} />;
  if (!permission.granted) {
    return (
      <View style={styles.containerCenter}>
        <Text style={styles.textInfo}>Permiso de cámara necesario para tomar fotos oficiales</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Otorgar Permiso</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      const options = { quality: 0.7, base64: true };
      const data = await cameraRef.current.takePictureAsync(options);
      setPhotoUri(data.uri);
    }
  };

  const guardarEnGaleria = async () => {
    if (!photoUri) return;
    if (!mediaPermission?.granted) {
      const permissionResponse = await requestMediaPermission();
      if (!permissionResponse.granted) {
        return Alert.alert("Permiso Denegado", "Necesitamos acceso para guardar fotos en tu dispositivo.");
      }
    }
    try {
      await MediaLibrary.saveToLibraryAsync(photoUri);
      Alert.alert("¡Guardada! 📸", "La foto se guardó en la galería de tu celular.");
    } catch (error) {
      Alert.alert("Aviso", "Procesada. En Expo Go el acceso a la galería puede estar limitado por Android. Para la versión final instalable se genera una Development Build.");
    }
  };

  const publicarEnMuro = async () => {
    if (!photoUri) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/fotos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario_nombre: 'Corredor Mijovi',
          imagen_url: photoUri
        })
      });
      if (res.ok) {
        Alert.alert("¡Éxito!", "Tu foto fue publicada en el Muro Comunitario.");
        setPhotoUri(null);
      } else {
        Alert.alert("Error", "No se pudo publicar la foto.");
      }
    } catch (e) {
      Alert.alert("Error", "Error de conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {!photoUri ? (
        <View style={StyleSheet.absoluteFillObject}>
          {/* Vista de Cámara independiente (Sin elementos hijos adentro) */}
          <CameraView style={StyleSheet.absoluteFillObject} ref={cameraRef} />

          {/* Superposición del Marco Oficial con posicionamiento absoluto */}
          <View style={styles.frameContainer} pointerEvents="none">
            <View style={styles.frameHeader}>
              <Text style={styles.frameTitle}>MARATÓN MIJOVI 2027</Text>
            </View>
            <View style={styles.frameFooter}>
              <Text style={styles.frameHashtag}>#MaratonMijovi2027</Text>
            </View>
          </View>

          {/* Botón Disparador */}
          <View style={styles.actionContainer}>
            <TouchableOpacity style={styles.captureBtn} onPress={takePicture}>
              <View style={styles.innerCaptureBtn} />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.previewContainer}>
          <Image source={{ uri: photoUri }} style={styles.previewImage} />
          
          <View style={styles.previewActions}>
            <TouchableOpacity style={styles.btnActionSecondary} onPress={guardarEnGaleria}>
              <Ionicons name="download-outline" size={18} color={Colors.white} />
              <Text style={styles.btnActionText}> Guardar Galería</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnActionPrimary} onPress={publicarEnMuro} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <Ionicons name="share-social" size={18} color={Colors.white} />
                  <Text style={styles.btnActionText}> Compartir Muro</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.btnRetake} onPress={() => setPhotoUri(null)}>
            <Text style={styles.btnRetakeText}>Tomar Otra Foto</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.black },
  containerCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  textInfo: { color: Colors.white, marginBottom: 15, textAlign: 'center' },
  btn: { backgroundColor: Colors.primary, padding: 12, borderRadius: 8 },
  btnText: { color: Colors.white, fontWeight: 'bold' },
  frameContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', padding: 20 },
  frameHeader: { backgroundColor: 'rgba(0,0,0,0.65)', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  frameTitle: { color: Colors.primary, fontWeight: 'bold', fontSize: 18, letterSpacing: 1.5 },
  frameFooter: { backgroundColor: 'rgba(241,90,36,0.85)', padding: 10, borderRadius: 8, alignItems: 'center', marginBottom: 80 },
  frameHashtag: { color: Colors.white, fontWeight: 'bold', fontSize: 15 },
  actionContainer: { position: 'absolute', bottom: 25, left: 0, right: 0, alignItems: 'center' },
  captureBtn: { width: 70, height: 70, borderRadius: 35, borderWidth: 4, borderColor: Colors.white, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  innerCaptureBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.primary },
  previewContainer: { flex: 1, backgroundColor: Colors.black, justifyContent: 'center', alignItems: 'center', padding: 15 },
  previewImage: { width: '100%', height: '68%', borderRadius: 12 },
  previewActions: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 15 },
  btnActionPrimary: { flex: 1, backgroundColor: Colors.primary, padding: 12, borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginLeft: 5 },
  btnActionSecondary: { flex: 1, backgroundColor: '#333', padding: 12, borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginRight: 5 },
  btnActionText: { color: Colors.white, fontWeight: 'bold', fontSize: 12 },
  btnRetake: { marginTop: 15 },
  btnRetakeText: { color: Colors.gray, fontSize: 13, textDecorationLine: 'underline' }
});