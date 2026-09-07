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
  const [editando, setEditando] = useState(false);
  
  const [nuevaDistancia, setNuevaDistancia] = useState('');
  const [nuevoTalle, setNuevoTalle] = useState('');

  const buscarPerfil = async () => {
    if (!dni) return Alert.alert("Atención", "Ingresa tu DNI");
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/corredor/dni/${dni}`);
      const data = await res.json();
      if (res.ok) {
        setCorredor(data);
        setNuevaDistancia(data.distancia);
        setNuevoTalle(data.talle_remera);
      } else {
        Alert.alert("No encontrado", data.detail || "No existe inscripción con este DNI");
      }
    } catch (e) {
      Alert.alert("Error", "Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  const handleGuardarCambios = async () => {
    try {
      const res = await fetch(`${API_URL}/api/corredor/cambiar-datos`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dni: corredor.dni, nueva_distancia: nuevaDistancia, nuevo_talle: nuevoTalle })
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert("¡Modificación Exitosa!", data.mensaje);
        setCorredor(data.corredor);
        setEditando(false);
      } else {
        Alert.alert("Error", data.detail || "No se pudo actualizar los datos");
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
          <Text style={styles.detail}>DNI: {corredor.dni} | WhatsApp: {corredor.whatsapp}</Text>
          <Text style={styles.detailSecundario}>Grupo Sanguíneo: <Text style={{fontWeight: 'bold', color: Colors.primary}}>{corredor.grupo_sanguineo}</Text></Text>

          <View style={styles.qrBox}>
            <QRCode value={corredor.qr_code} size={150} color={Colors.black} />
          </View>
          <Text style={styles.qrCodeText}>{corredor.qr_code}</Text>

          {/* Información Útil Integrada */}
          <View style={styles.infoBoxPerfil}>
            <View style={styles.infoRowItem}>
              <Ionicons name="time-outline" size={16} color={Colors.primary} />
              <Text style={styles.infoRowText}>Largada: {corredor.distancia === '21K' ? '07:30 HS' : corredor.distancia === '10K' ? '08:00 HS' : '08:30 HS'}</Text>
            </View>
            <View style={styles.infoRowItem}>
              <Ionicons name="call-outline" size={16} color={Colors.primary} />
              <Text style={styles.infoRowText}>Emergencia: {corredor.telefono_emergencia}</Text>
            </View>
            {corredor.certificado_medico_url ? (
              <View style={styles.infoRowItem}>
                <Ionicons name="document-text-outline" size={16} color="#28A745" />
                <Text style={[styles.infoRowText, {color: '#28A745', fontWeight: 'bold'}]}>Certificado Médico Adjunto Registrado</Text>
              </View>
            ) : (
              <View style={styles.infoRowItem}>
                <Ionicons name="alert-circle-outline" size={16} color="#D9534F" />
                <Text style={[styles.infoRowText, {color: '#D9534F'}]}>Certificado Médico Pendiente de Presentar</Text>
              </View>
            )}
          </View>

          {/* Gestión de Cambio de Distancia o Talle de Remera */}
          <View style={styles.changeCategoryBox}>
            <Text style={styles.distanciaActual}>Categoría: <Text style={{ color: Colors.primary }}>{corredor.distancia}</Text> | Remera: <Text style={{ color: Colors.primary }}>{corredor.talle_remera}</Text></Text>
            
            {!corredor.acreditado ? (
              <>
                {!editando ? (
                  <TouchableOpacity style={styles.btnCambiar} onPress={() => setEditando(true)}>
                    <Text style={styles.btnCambiarText}>⚙️ Modificar Distancia o Talle</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{ marginTop: 10, width: '100%' }}>
                    <Text style={styles.subText}>Nueva Distancia:</Text>
                    <View style={styles.rowSelector}>
                      {['5K', '10K', '21K'].map((d) => (
                        <TouchableOpacity key={d} style={[styles.chipDist, nuevaDistancia === d && styles.chipActive]} onPress={() => setNuevaDistancia(d)}>
                          <Text style={[styles.chipDistText, nuevaDistancia === d && styles.chipActiveText]}>{d}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={[styles.subText, {marginTop: 10}]}>Nuevo Talle de Remera:</Text>
                    <View style={styles.rowSelector}>
                      {['S', 'M', 'L', 'XL', 'XXL'].map((t) => (
                        <TouchableOpacity key={t} style={[styles.chipDist, nuevoTalle === t && styles.chipActive]} onPress={() => setNuevoTalle(t)}>
                          <Text style={[styles.chipDistText, nuevoTalle === t && styles.chipActiveText]}>{t}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <View style={{flexDirection: 'row', marginTop: 12}}>
                      <TouchableOpacity style={[styles.btnModalOpt, {backgroundColor: Colors.gray}]} onPress={() => setEditando(false)}>
                        <Text style={styles.btnText}>Cancelar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.btnModalOpt, {backgroundColor: Colors.primary}]} onPress={handleGuardarCambios}>
                        <Text style={styles.btnText}>Guardar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.acreditadoBadge}>✅ Kit Acreditado (Datos Bloqueados)</Text>
            )}
          </View>

          <TouchableOpacity style={styles.btnSecondary} onPress={() => { setCorredor(null); setEditando(false); }}>
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
  detail: { color: Colors.gray, marginBottom: 4, fontSize: 12 },
  detailSecundario: { color: Colors.gray, marginBottom: 12, fontSize: 12 },
  qrBox: { padding: 10, backgroundColor: Colors.white, borderWidth: 1, borderColor: '#EEE', borderRadius: 8 },
  qrCodeText: { marginTop: 6, fontWeight: 'bold', color: Colors.primary, fontSize: 11 },
  infoBoxPerfil: { width: '100%', backgroundColor: '#F8F9FA', padding: 12, borderRadius: 8, marginTop: 12, borderWidth: 1, borderColor: '#E9ECEF' },
  infoRowItem: { flexDirection: 'row', alignItems: 'center', marginVertical: 3 },
  infoRowText: { fontSize: 11, color: Colors.black, marginLeft: 8 },
  changeCategoryBox: { marginTop: 12, width: '100%', padding: 12, backgroundColor: '#F8F9FA', borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#E9ECEF' },
  distanciaActual: { fontWeight: 'bold', fontSize: 13, color: Colors.black },
  btnCambiar: { marginTop: 8, backgroundColor: Colors.black, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  btnCambiarText: { color: Colors.white, fontSize: 12, fontWeight: 'bold' },
  subText: { fontSize: 11, color: Colors.gray, textAlign: 'left', marginBottom: 4, fontWeight: 'bold' },
  rowSelector: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  chipDist: { flex: 1, paddingVertical: 6, marginHorizontal: 2, backgroundColor: Colors.white, borderWidth: 1, borderColor: '#DDD', borderRadius: 6, alignItems: 'center' },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipDistText: { color: Colors.black, fontWeight: 'bold', fontSize: 11 },
  chipActiveText: { color: Colors.white },
  btnModalOpt: { flex: 1, padding: 8, borderRadius: 6, alignItems: 'center', marginHorizontal: 4 },
  acreditadoBadge: { marginTop: 6, color: '#28A745', fontWeight: 'bold', fontSize: 12 },
  input: { backgroundColor: Colors.background, color: Colors.black, padding: 12, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#DDD' },
  btn: { backgroundColor: Colors.primary, padding: 14, borderRadius: 8, alignItems: 'center' },
  btnText: { color: Colors.white, fontWeight: 'bold', fontSize: 12 },
  btnSecondary: { marginTop: 15 },
  btnTextSecondary: { color: Colors.gray, fontWeight: 'bold', fontSize: 12 }
});