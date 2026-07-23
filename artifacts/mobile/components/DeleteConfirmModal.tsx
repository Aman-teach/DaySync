import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

interface Props {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
}

export function DeleteConfirmModal({
  visible,
  onCancel,
  onConfirm,
  title = 'Delete Entry',
  message = 'This entry will be permanently removed and cannot be recovered.',
}: Props) {
  const colors = useColors();

  const deleteScale = useSharedValue(1);
  const deleteStyle = useAnimatedStyle(() => ({ transform: [{ scale: deleteScale.value }] }));

  const handleConfirm = () => {
    deleteScale.value = withSpring(0.92, { damping: 8, stiffness: 300 }, () => {
      deleteScale.value = withSpring(1, { damping: 9, stiffness: 250 });
    });
    onConfirm();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <View style={styles.centeredView} pointerEvents="box-none">
        <View style={[styles.card, { backgroundColor: colors.background }]}>
          {/* Danger icon */}
          <View style={[styles.iconWrap, { backgroundColor: '#FEE2E2' }]}>
            <Feather name="trash-2" size={24} color="#DC2626" />
          </View>

          <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.mutedForeground }]}>{message}</Text>

          <View style={styles.btnRow}>
            {/* Cancel */}
            <Pressable
              style={[styles.btn, styles.cancelBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
              onPress={onCancel}
            >
              <Text style={[styles.btnText, { color: colors.foreground }]}>Cancel</Text>
            </Pressable>

            {/* Delete */}
            <Animated.View style={[{ flex: 1 }, deleteStyle]}>
              <Pressable
                style={[styles.btn, styles.deleteBtn]}
                onPress={handleConfirm}
              >
                <Feather name="trash-2" size={14} color="#fff" />
                <Text style={[styles.btnText, styles.deleteBtnText]}>Delete</Text>
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#00000066',
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 40,
    elevation: 20,
  },
  iconWrap: {
    width: 60, height: 60, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  title: { fontSize: 18, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  message: { fontSize: 14, fontFamily: 'Inter_400Regular', lineHeight: 20, textAlign: 'center' },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 6, width: '100%' },
  btn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 14, gap: 6, borderWidth: 1.5,
  },
  cancelBtn: { borderWidth: 1.5 },
  deleteBtn: { backgroundColor: '#DC2626', borderColor: '#DC2626' },
  btnText: { fontSize: 15, fontFamily: 'Inter_700Bold' },
  deleteBtnText: { color: '#fff' },
});
