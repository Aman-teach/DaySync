import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Domain, Activity } from '@/types';
import { generateId } from '@/utils/helpers';
import * as Haptics from 'expo-haptics';

const ICONS = [
  'activity', 'anchor', 'aperture', 'archive', 'award', 'bar-chart', 'battery', 'bell', 'book', 'book-open',
  'box', 'briefcase', 'camera', 'cast', 'circle', 'clipboard', 'clock', 'cloud', 'code', 'coffee',
  'compass', 'cpu', 'crosshair', 'database', 'disc', 'dollar-sign', 'droplet', 'edit', 'eye', 'feather',
  'file', 'film', 'flag', 'folder', 'gift', 'globe', 'hash', 'heart', 'home', 'image',
  'inbox', 'key', 'layers', 'layout', 'life-buoy', 'link', 'list', 'lock', 'map', 'map-pin',
  'message-circle', 'mic', 'monitor', 'moon', 'music', 'navigation', 'package', 'paperclip', 'pen-tool', 'percent',
  'phone', 'pie-chart', 'play', 'power', 'printer', 'radio', 'save', 'scissors', 'search', 'send',
  'server', 'settings', 'shield', 'shopping-bag', 'shopping-cart', 'smartphone', 'smile', 'speaker', 'star', 'sun',
  'target', 'terminal', 'thermometer', 'thumbs-up', 'toggle-left', 'toggle-right', 'tool', 'trash', 'trending-up', 'tv',
  'umbrella', 'unlock', 'upload', 'user', 'users', 'video', 'volume-2', 'watch', 'wifi', 'wind', 'zap'
];

export default function ManageDomainsScreen() {
  const { domains, activities, addDomain, updateDomain, removeDomain, addActivity, updateActivity, removeActivity } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // Modals state
  const [editingDomain, setEditingDomain] = useState<Domain | null>(null);
  const [isDomainModalVisible, setDomainModalVisible] = useState(false);
  
  const [editingActivity, setEditingActivity] = useState<Partial<Activity> | null>(null);
  const [isActivityModalVisible, setActivityModalVisible] = useState(false);

  const [isIconPickerVisible, setIconPickerVisible] = useState(false);
  const [iconPickerTarget, setIconPickerTarget] = useState<'domain' | 'activity' | null>(null);

  // Forms state
  const [domainForm, setDomainForm] = useState({ name: '', icon: 'circle', color: '#3B82F6' });
  const [activityForm, setActivityForm] = useState({ name: '', icon: 'circle', domainId: '' });
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'domain' | 'activity', item: any } | null>(null);

  // --- Domain Actions ---
  const openNewDomain = () => {
    setDomainForm({ name: '', icon: 'circle', color: '#3B82F6' });
    setEditingDomain(null);
    setDomainModalVisible(true);
  };

  const openEditDomain = (d: Domain) => {
    setDomainForm({ name: d.name, icon: d.icon, color: d.color });
    setEditingDomain(d);
    setDomainModalVisible(true);
  };

  const saveDomain = async () => {
    if (!domainForm.name.trim()) return;
    if (editingDomain) {
      await updateDomain({ ...editingDomain, ...domainForm });
    } else {
      await addDomain({
        id: generateId(),
        position: domains.length,
        ...domainForm
      });
    }
    setDomainModalVisible(false);
  };

  const handleDeleteDomain = (d: Domain) => {
    setDeleteTarget({ type: 'domain', item: d });
  };

  // --- Activity Actions ---
  const openNewActivity = (domainId: string) => {
    setActivityForm({ name: '', icon: 'circle', domainId });
    setEditingActivity(null);
    setActivityModalVisible(true);
  };

  const openEditActivity = (a: Activity) => {
    setActivityForm({ name: a.name, icon: a.icon || 'circle', domainId: a.domainId });
    setEditingActivity(a);
    setActivityModalVisible(true);
  };

  const saveActivity = async () => {
    if (!activityForm.name.trim() || !activityForm.domainId) return;
    if (editingActivity && editingActivity.id) {
      await updateActivity({ ...(editingActivity as Activity), ...activityForm });
    } else {
      const pos = activities.filter(a => a.domainId === activityForm.domainId).length;
      await addActivity({
        id: generateId(),
        position: pos,
        ...activityForm
      });
    }
    setActivityModalVisible(false);
  };

  const handleDeleteActivity = (a: Activity) => {
    setDeleteTarget({ type: 'activity', item: a });
  };

  // --- Reordering ---
  const moveDomain = async (index: number, direction: -1 | 1) => {
    const sorted = [...domains].sort((a,b) => a.position - b.position);
    if (index + direction < 0 || index + direction >= sorted.length) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const target = sorted[index];
    const swap = sorted[index + direction];
    
    const temp = target.position;
    target.position = swap.position;
    swap.position = temp;
    
    await updateDomain(target);
    await updateDomain(swap);
  };

  const moveActivity = async (domainId: string, index: number, direction: -1 | 1) => {
    const sorted = activities.filter(a => a.domainId === domainId).sort((a,b) => a.position - b.position);
    if (index + direction < 0 || index + direction >= sorted.length) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const target = sorted[index];
    const swap = sorted[index + direction];
    
    const temp = target.position;
    target.position = swap.position;
    swap.position = temp;
    
    await updateActivity(target);
    await updateActivity(swap);
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
        <Text style={[styles.header, { color: colors.foreground }]}>Manage Areas</Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>Configure your domains and specific activities.</Text>

        <View style={styles.list}>
          {[...domains].sort((a,b) => a.position - b.position).map((d, dIdx) => (
            <View key={d.id} style={[styles.domainCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Domain Header */}
              <View style={[styles.domainHeader, { borderBottomColor: colors.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                  <View style={[styles.iconWrap, { backgroundColor: d.color + '22' }]}>
                    <Feather name={d.icon as any} size={18} color={d.color} />
                  </View>
                  <Text style={[styles.domainName, { color: colors.foreground }]} numberOfLines={1}>{d.name}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <TouchableOpacity onPress={() => moveDomain(dIdx, -1)} disabled={dIdx === 0} style={{ opacity: dIdx === 0 ? 0.2 : 1 }}>
                    <Feather name="chevron-up" size={20} color={colors.mutedForeground} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => moveDomain(dIdx, 1)} disabled={dIdx === domains.length - 1} style={{ opacity: dIdx === domains.length - 1 ? 0.2 : 1 }}>
                    <Feather name="chevron-down" size={20} color={colors.mutedForeground} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => openEditDomain(d)} style={{ marginLeft: 8 }}>
                    <Feather name="edit-2" size={18} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteDomain(d)} style={{ marginLeft: 8 }}>
                    <Feather name="trash-2" size={18} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Activities */}
              <View style={styles.activitiesContainer}>
                {activities.filter(a => a.domainId === d.id).sort((a,b) => a.position - b.position).map((a, aIdx, arr) => (
                  <View key={a.id} style={[styles.activityRow, { borderBottomColor: colors.border, borderBottomWidth: aIdx === arr.length - 1 ? 0 : 1 }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                      <Feather name={(a.icon || 'circle') as any} size={14} color={colors.mutedForeground} />
                      <Text style={[styles.activityName, { color: colors.foreground }]} numberOfLines={1}>{a.name}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <TouchableOpacity onPress={() => moveActivity(d.id, aIdx, -1)} disabled={aIdx === 0} style={{ opacity: aIdx === 0 ? 0.2 : 1, padding: 4 }}>
                        <Feather name="arrow-up" size={16} color={colors.mutedForeground} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => moveActivity(d.id, aIdx, 1)} disabled={aIdx === arr.length - 1} style={{ opacity: aIdx === arr.length - 1 ? 0.2 : 1, padding: 4 }}>
                        <Feather name="arrow-down" size={16} color={colors.mutedForeground} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => openEditActivity(a)} style={{ padding: 4 }}>
                        <Feather name="edit-2" size={14} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteActivity(a)} style={{ padding: 4 }}>
                        <Feather name="trash-2" size={14} color={colors.destructive} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                
                <TouchableOpacity onPress={() => openNewActivity(d.id)} style={[styles.addActivityBtn, { backgroundColor: colors.background }]}>
                  <Feather name="plus" size={14} color={colors.primary} />
                  <Text style={[styles.addActivityText, { color: colors.primary }]}>Add Activity</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity onPress={openNewDomain} style={[styles.addDomainBtn, { backgroundColor: colors.primary, shadowColor: colors.primary }]}>
          <Feather name="plus" size={18} color="#fff" />
          <Text style={styles.addDomainText}>New Area</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* DOMAIN MODAL */}
      <Modal visible={isDomainModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border, paddingBottom: Math.max(insets.bottom, 24) }]}>
            <Text style={[styles.modalHeader, { color: colors.foreground }]}>{editingDomain ? 'Edit Area' : 'New Area'}</Text>
            
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>Name</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                value={domainForm.name}
                onChangeText={t => setDomainForm(prev => ({...prev, name: t}))}
                placeholder="e.g. Business"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>Icon & Color</Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  style={[styles.iconPickerBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
                  onPress={() => { setIconPickerTarget('domain'); setIconPickerVisible(true); }}
                >
                  <Feather name={domainForm.icon as any} size={20} color={domainForm.color} />
                  <Text style={{ color: colors.foreground, fontFamily: 'Inter_500Medium' }}>Choose Icon</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtn} onPress={() => setDomainModalVisible(false)}>
                <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold', fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.primary }]} onPress={saveDomain}>
                <Text style={{ color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 16 }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ACTIVITY MODAL */}
      <Modal visible={isActivityModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border, paddingBottom: Math.max(insets.bottom, 24) }]}>
            <Text style={[styles.modalHeader, { color: colors.foreground }]}>{editingActivity ? 'Edit Activity' : 'New Activity'}</Text>
            
            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>Name</Text>
              <TextInput
                style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
                value={activityForm.name}
                onChangeText={t => setActivityForm(prev => ({...prev, name: t}))}
                placeholder="e.g. Reading"
                placeholderTextColor={colors.mutedForeground}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>Icon</Text>
              <TouchableOpacity
                style={[styles.iconPickerBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
                onPress={() => { setIconPickerTarget('activity'); setIconPickerVisible(true); }}
              >
                <Feather name={activityForm.icon as any} size={20} color={colors.foreground} />
                <Text style={{ color: colors.foreground, fontFamily: 'Inter_500Medium' }}>Choose Icon</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.formLabel, { color: colors.mutedForeground }]}>Area</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {[...domains].sort((a,b) => a.position - b.position).map(d => (
                  <TouchableOpacity
                    key={d.id}
                    style={[{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: activityForm.domainId === d.id ? colors.primary : colors.border, backgroundColor: activityForm.domainId === d.id ? colors.primary + '11' : colors.background }]}
                    onPress={() => setActivityForm(prev => ({...prev, domainId: d.id}))}
                  >
                    <Text style={{ color: activityForm.domainId === d.id ? colors.primary : colors.foreground, fontFamily: 'Inter_500Medium' }}>{d.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtn} onPress={() => setActivityModalVisible(false)}>
                <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold', fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.primary }]} onPress={saveActivity}>
                <Text style={{ color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 16 }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ICON PICKER MODAL */}
      <Modal visible={isIconPickerVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border, height: '80%', paddingBottom: Math.max(insets.bottom, 24) }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={[styles.modalHeader, { marginBottom: 0, color: colors.foreground }]}>Choose Icon</Text>
              <TouchableOpacity onPress={() => setIconPickerVisible(false)}>
                <Feather name="x" size={24} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.iconGrid}>
              {ICONS.map(name => (
                <TouchableOpacity
                  key={name}
                  style={[styles.iconCell, { 
                    backgroundColor: colors.background, 
                    borderColor: (iconPickerTarget === 'domain' ? domainForm.icon === name : activityForm.icon === name) ? colors.primary : colors.border,
                    borderWidth: (iconPickerTarget === 'domain' ? domainForm.icon === name : activityForm.icon === name) ? 2 : 1
                  }]}
                  onPress={() => {
                    if (iconPickerTarget === 'domain') setDomainForm(prev => ({...prev, icon: name}));
                    else setActivityForm(prev => ({...prev, icon: name}));
                    setIconPickerVisible(false);
                  }}
                >
                  <Feather name={name as any} size={24} color={colors.foreground} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>


      {/* DELETE MODAL */}
      <Modal visible={!!deleteTarget} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border, padding: 24, paddingBottom: 24, maxHeight: undefined }]}>
            <Text style={[styles.modalHeader, { color: colors.foreground, marginBottom: 12 }]}>
              {deleteTarget?.type === 'domain' ? 'Delete Area' : 'Delete Activity'}
            </Text>
            <Text style={{ fontSize: 16, fontFamily: 'Inter_400Regular', color: colors.mutedForeground, marginBottom: 32, lineHeight: 22 }}>
              {deleteTarget?.type === 'domain' 
                ? `Are you sure you want to delete ${deleteTarget?.item.name}? This will also remove all its activities.`
                : `Are you sure you want to delete ${deleteTarget?.item.name}? Old journal entries using this activity will keep the record but lose the activity name connection.`
              }
            </Text>
            
            <View style={[styles.modalActions, { marginTop: 0 }]}>
              <TouchableOpacity style={styles.modalBtn} onPress={() => setDeleteTarget(null)}>
                <Text style={{ color: colors.mutedForeground, fontFamily: 'Inter_600SemiBold', fontSize: 16 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, { backgroundColor: colors.destructive }]} 
                onPress={async () => {
                  if (deleteTarget?.type === 'domain') {
                    const dActivities = activities.filter((a: any) => a.domainId === deleteTarget.item.id);
                    for (const a of dActivities) await removeActivity(a.id);
                    await removeDomain(deleteTarget.item.id);
                  } else if (deleteTarget?.type === 'activity') {
                    await removeActivity(deleteTarget.item.id);
                  }
                  setDeleteTarget(null);
                }}
              >
                <Text style={{ color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 16 }}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { fontSize: 32, fontFamily: 'Inter_700Bold', letterSpacing: -1 },
  sub: { fontSize: 16, fontFamily: 'Inter_400Regular', marginTop: 4, marginBottom: 24 },
  list: { gap: 16 },
  domainCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  domainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  iconWrap: {
    width: 36, height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  domainName: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  activitiesContainer: {
    padding: 8,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  activityName: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
  },
  addActivityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  addActivityText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  addDomainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 24,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addDomainText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
  iconPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 8,
  },
  modalBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  iconCell: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
