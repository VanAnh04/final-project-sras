import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { garageApi } from '../api/garageApi';

interface GarageSettings {
  /** Tự động nhận cuốc cứu hộ khi có lời mời (không cần bấm nhận thủ công). */
  autoAccept: boolean;
  setAutoAccept: (v: boolean) => void;
  toggleAutoAccept: () => void;
}

const GarageSettingsContext = createContext<GarageSettings>({
  autoAccept: false,
  setAutoAccept: () => {},
  toggleAutoAccept: () => {},
});

export function GarageSettingsProvider({ children }: { children: ReactNode }) {
  const [autoAccept, setAutoAcceptState] = useState(false);

  // Nạp giá trị thật từ backend khi vào khu vực gara.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const g = await garageApi.getMyGarage();
        if (alive && typeof g?.autoAccept === 'boolean') setAutoAcceptState(g.autoAccept);
      } catch {
        /* chưa có gara / lỗi mạng — giữ mặc định tắt */
      }
    })();
    return () => { alive = false; };
  }, []);

  // Đổi + lưu backend (optimistic, rollback nếu lỗi).
  const persist = async (v: boolean) => {
    setAutoAcceptState(v);
    try {
      await garageApi.setAutoAccept(v);
    } catch {
      setAutoAcceptState(!v);
    }
  };

  return (
    <GarageSettingsContext.Provider
      value={{ autoAccept, setAutoAccept: persist, toggleAutoAccept: () => persist(!autoAccept) }}
    >
      {children}
    </GarageSettingsContext.Provider>
  );
}

export const useGarageSettings = () => useContext(GarageSettingsContext);
