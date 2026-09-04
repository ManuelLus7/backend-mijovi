import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../colors';

const API_URL = 'https://backend-mijovi-production.up.railway.app';

export default function PerfilScreen() {
  const [dni, setDni] = useState('');
  const [corredor, setCorredor] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [editandoDistancia, setEditandoDistancia] = useState(false);

  const buscarPerfil = async () => {
    if (!dni) return Alert.alert("Atención", "Ingresa tu DNI");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/corredor/dni/${dni}`);
      const data = await res.json();
      if (res.ok) {
        setCorredor(data);
      } else {
        Alert.alert("No encontrado", data.detail || "No existe inscripción con este DNI");
      }
    } catch (e) {
      Alert.alert("Error", "Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  const handleCambioDistancia = async (nuevaDist: string) => {
    try {
      const res = await fetch(`${API_URL}/api/corredor/cambiar-distancia`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dni: corredor.dni, nueva_distancia: nuevaDist })
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert("¡Cambio Exitoso!", data.mensaje);
        setCorredor(data.corredor);
        setEditandoDistancia(false);
      } else {
        Alert.alert("Error", data.detail || "No se pudo actualizar la distancia");
      }
    } catch (e) {
      Alert.alert("Error", "No se pudo contactar al servidor");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {!corredor ? (
        <View style={styles.card}>
          <Text style={styles.title}>Consulta tu Inscripción</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Ingresa tu DNI" 
            placeholderTextColor="#888"
            keyboardType="numeric" 
            value={dni} 
            onChangeText={setDni} 
          />
          <TouchableOpacity style={styles.btn} onPress={buscarPerfil} disabled={loading}>
            {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.btnText}>Buscar mi Pase Digital</Text>}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.cardProfile}>
          <Text style={styles.badgeLabel}>PASE DIGITAL DE ACREDITACIÓN</Text>
          <Text style={styles.name}>{corredor.nombre_completo}</Text>
          <Text style={styles.detail}>DNI: {corredor.dni} | Talle: {corredor.talle_remera}</Text>

          <View style={styles.qrBox}>
            <QRCode value={corredor.qr_code} size={160} color={Colors.black} />
          </View>
          <Text style={styles.qrCodeText}>{corredor.qr_code}</Text>

          {/* Información Útil Integrada */}
          <View style={styles.infoBoxPase}>
            <Text style={styles.infoBoxTitle}>📌 Información Importante para el Día</Text>
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={16} color={Colors.primary} />
              <Text style={styles.infoTextPase}>Largada {corredor.distancia}: 08:00 hs (Presentarse 45 min antes)</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={16} color={Colors.primary} />
              <Text style={styles.infoTextPase}>Retiro de Kit: Centro de Exposiciones (Día previo)</Text>
            </View>
            {corredor.distancia !== '5K' && (
              <View style={styles.infoRow}>
                <Ionicons name="document-text-outline" size={16} color={Colors.primary} />
                <Text style={styles.infoTextPase}>Requisito: Presentar Certificado Médico de Aptitud Física</Text>
              </View>
            )}
          </View>

          {/* Gestión de Cambio de Categoría / Distancia */}
          <View style={styles.changeCategoryBox}>
            <Text style={styles.distanciaActual}>Categoría Actual: <Text style={{ color: Colors.primary }}>{corredor.distancia}</Text></Text>
            
            {!corredor.acreditado ? (
              <>
                {!editandoDistancia ? (
                  <TouchableOpacity style={styles.btnCambiar} onPress={() => setEditandoDistancia(true)}>
                    <Text style={styles.btnCambiarText}>⚙️ Cambiar Categoría (5K / 10K / 21K)</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{ marginTop: 10, width: '100%' }}>
                    <Text style={styles.subText}>Selecciona tu nueva distancia:</Text>
                    <View style={styles.rowSelector}>
                      {['5K', '10K', '21K'].map((d) => (
                        <TouchableOpacity 
                          key={d} 
                          style={[styles.chipDist, corredor.distancia === d && styles.chipActive]} 
                          onPress={() => handleCambioDistancia(d)}
                        >
                          <Text style={[styles.chipDistText, corredor.distancia === d && styles.chipActiveText]}>{d}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TouchableOpacity style={{ marginTop: 8 }} onPress={() => setEditandoDistancia(false)}>
                      <Text style={{ color: Colors.gray, textAlign: 'center', fontSize: 12 }}>Cancelar</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.acreditadoBadge}>✅ Kit Acreditado (Categoría Bloqueada)</Text>
            )}
          </View>

          <TouchableOpacity style={styles.btnSecondary} onPress={() => { setCorredor(null); setEditandoDistancia(false); }}>
            <Text style={styles.btnTextSecondary}>Consultar otro DNI</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: Colors.background, justifyContent: 'center' },
  card: { backgroundColor: Colors.white, padding: 20, borderRadius: 12 },
  cardProfile: { backgroundColor: Colors.white, padding: 20, borderRadius: 12, alignItems: 'center' },
  title: { fontSize: 18, fontWeight: 'bold', color: Colors.black, marginBottom: 15 },
  badgeLabel: { backgroundColor: Colors.primary, color: Colors.white, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, fontSize: 10, fontWeight: 'bold', marginBottom: 10 },
  name: { fontSize: 20, fontWeight: 'bold', color: Colors.black },
  detail: { color: Colors.gray, marginBottom: 15, fontSize: 13 },
  qrBox: { padding: 12, backgroundColor: Colors.white, borderWidth: 1, borderColor: '#EEE', borderRadius: 8 },
  qrCodeText: { marginTop: 8, fontWeight: 'bold', color: Colors.primary, fontSize: 11 },
  infoBoxPase: { width: '100%', backgroundColor: '#F1F5F9', padding: 12, borderRadius: 10, marginTop: 15, borderWidth: 1, borderColor: '#E2E8F0' },
  infoBoxTitle: { fontWeight: 'bold', fontSize: 12, color: Colors.black, marginBottom: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 3 },
  infoTextPase: { fontSize: 11, color: '#334155', marginLeft: 6, flex: 1 },
  changeCategoryBox: { marginTop: 15, width: '100%', padding: 12, backgroundColor: '#F8F9FA', borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#E9ECEF' },
  distanciaActual: { fontWeight: 'bold', fontSize: 14, color: Colors.black },
  btnCambiar: { marginTop: 8, backgroundColor: Colors.black, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  btnCambiarText: { color: Colors.white, fontSize: 12, fontWeight: 'bold' },
  subText: { fontSize: 11, color: Colors.gray, textAlign: 'center', marginBottom: 6 },
  rowSelector: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
  chipDist: { flex: 1, paddingVertical: 8, marginHorizontal: 3, backgroundColor: Colors.white, borderWidth: 1, borderColor: '#DDD', borderRadius: 6, alignItems: 'center' },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipDistText: { color: Colors.black, fontWeight: 'bold', fontSize: 12 },
  chipActiveText: { color: Colors.white },
  acreditadoBadge: { marginTop: 6, color: '#28A745', fontWeight: 'bold', fontSize: 12 },
  input: { backgroundColor: Colors.background, color: Colors.black, padding: 12, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#DDD' },
  btn: { backgroundColor: Colors.primary, padding: 14, borderRadius: 8, alignItems: 'center' },
  btnText: { color: Colors.white, fontWeight: 'bold' },
  btnSecondary: { marginTop: 15 },
  btnTextSecondary: { color: Colors.gray, fontWeight: 'bold', fontSize: 12 }
});