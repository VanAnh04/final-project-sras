import { useEffect, useState } from 'react';
import { View, Text, TextInput, StyleSheet, Modal, FlatList, Pressable, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Search, Check } from 'lucide-react-native';
import { withdrawalApi, type Bank } from '../../api/withdrawalApi';
import { bankInitials, normalizeHolderName } from '../../utils/withdraw';
import { C, R } from './theme';

type Props = {
  visible: boolean;
  selectedBin?: string | null;
  onSelect: (bank: Bank) => void;
  onClose: () => void;
};

const searchKey = (b: Bank) => normalizeHolderName(`${b.shortName} ${b.code} ${b.name}`);

/** Chọn ngân hàng nhận tiền: tìm không phân biệt hoa thường, bỏ dấu. */
export default function BankPickerModal({ visible, selectedBin, onSelect, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      {visible && <BankPickerBody selectedBin={selectedBin} onSelect={onSelect} onClose={onClose} />}
    </Modal>
  );
}

function BankPickerBody({ selectedBin, onSelect, onClose }: Omit<Props, 'visible'>) {
  const [banks, setBanks] = useState<Bank[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    withdrawalApi
      .getBanks()
      .then((list) => {
        if (alive) setBanks(list);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [attempt]);

  const retry = () => {
    setFailed(false);
    setAttempt((n) => n + 1);
  };

  const q = normalizeHolderName(query).trim();
  const filtered = banks ? (q ? banks.filter((b) => searchKey(b).includes(q)) : banks) : [];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Chọn ngân hàng</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn} accessibilityLabel="Đóng" hitSlop={8}>
          <X size={22} color={C.ink} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Search size={16} color={C.faint} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Tìm theo tên hoặc mã ngân hàng"
          placeholderTextColor={C.muted}
          autoCorrect={false}
          style={styles.searchInput}
        />
        {!!query && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Xoá tìm kiếm">
            <X size={16} color={C.faint} />
          </TouchableOpacity>
        )}
      </View>

      {failed ? (
        <View style={styles.stateBox}>
          <Text style={styles.stateText}>Không tải được danh sách ngân hàng.</Text>
          <TouchableOpacity onPress={retry} hitSlop={8}>
            <Text style={styles.retry}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : banks === null ? (
        <View style={styles.list}>
          {Array.from({ length: 8 }).map((_, i) => (
            <View key={i} style={styles.row}>
              <View style={[styles.avatar, styles.skeleton]} />
              <View style={{ flex: 1, gap: 6 }}>
                <View style={[styles.skeleton, { width: 96, height: 14, borderRadius: 4 }]} />
                <View style={[styles.skeleton, { width: '70%', height: 12, borderRadius: 4 }]} />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(b) => b.bin}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={[styles.stateText, { paddingTop: 24 }]}>Không có ngân hàng nào khớp “{query.trim()}”.</Text>
          }
          renderItem={({ item }) => {
            const selected = item.bin === selectedBin;
            return (
              <Pressable
                onPress={() => onSelect(item)}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{bankInitials(item.shortName)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.shortName}>{item.shortName}</Text>
                  <Text style={styles.fullName} numberOfLines={1}>
                    {item.name}
                  </Text>
                </View>
                {selected && <Check size={20} color={C.accent} />}
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.ground },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: { fontSize: 20, fontWeight: '700', color: C.ink },
  closeBtn: { width: 44, height: 44, alignItems: 'flex-end', justifyContent: 'center' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: R.control,
    backgroundColor: C.well,
  },
  searchInput: { flex: 1, fontSize: 15, color: C.ink, paddingVertical: 0 },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.rule,
  },
  rowPressed: { backgroundColor: C.well },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.rule,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 12, fontWeight: '700', color: C.ink },
  shortName: { fontSize: 15, fontWeight: '600', color: C.ink },
  fullName: { fontSize: 13, color: C.muted, marginTop: 2 },
  skeleton: { backgroundColor: C.skeleton },
  stateBox: { alignItems: 'center', gap: 8, paddingTop: 32, paddingHorizontal: 24 },
  stateText: { fontSize: 14, color: C.muted, textAlign: 'center' },
  retry: { fontSize: 14, fontWeight: '600', color: C.accent, paddingVertical: 6 },
});
