"use client";

import { useEffect, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ALLOWED_RADIUS_M, SITES, getSiteByName, resolveSiteName } from "@/lib/sites";
const COOLDOWN_MS = 60 * 1000;

const STORAGE_KEYS = {
  userName: "emp_userName",
  siteName: "emp_siteName",
  lastCheckIn: "emp_lastCheckIn",
  lastCheckOut: "emp_lastCheckOut",
};

function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("이 기기에서는 GPS를 사용할 수 없습니다."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });
}

export default function Home() {
  const [isReady, setIsReady] = useState(false);
  const [userName, setUserName] = useState("");
  const [siteName, setSiteName] = useState(SITES[0].name);
  const [isRegistered, setIsRegistered] = useState(false);

  const [setupName, setSetupName] = useState("");
  const [setupSite, setSetupSite] = useState(SITES[0].name);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState("");

  const [processingType, setProcessingType] = useState(null);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    const savedName = localStorage.getItem(STORAGE_KEYS.userName);
    const savedSite = localStorage.getItem(STORAGE_KEYS.siteName);
    const resolvedSite = savedSite ? resolveSiteName(savedSite) : "";

    if (savedName && resolvedSite && getSiteByName(resolvedSite)) {
      setUserName(savedName);
      setSiteName(resolvedSite);
      setIsRegistered(true);
      if (savedSite !== resolvedSite) {
        localStorage.setItem(STORAGE_KEYS.siteName, resolvedSite);
      }
    }

    setIsReady(true);
  }, []);

  const showAlert = (message) => setAlert(message);
  const closeAlert = () => setAlert(null);

  const saveProfile = (name, site) => {
    localStorage.setItem(STORAGE_KEYS.userName, name);
    localStorage.setItem(STORAGE_KEYS.siteName, site);
    setUserName(name);
    setSiteName(site);
    setIsRegistered(true);
  };

  const handleSetupSubmit = (e) => {
    e.preventDefault();
    const trimmed = setupName.trim();
    if (!trimmed) {
      showAlert("이름을 입력해 주세요.");
      return;
    }
    saveProfile(trimmed, setupSite);
  };

  const handleSaveName = () => {
    const trimmed = editName.trim();
    if (!trimmed) {
      showAlert("이름을 입력해 주세요.");
      return;
    }
    localStorage.setItem(STORAGE_KEYS.userName, trimmed);
    setUserName(trimmed);
    setIsEditingName(false);
  };

  const handleSiteChange = (newSite) => {
    setSiteName(newSite);
    localStorage.setItem(STORAGE_KEYS.siteName, newSite);
  };

  const handleAttendance = async (type) => {
    const storageKey =
      type === "CHECK_IN" ? STORAGE_KEYS.lastCheckIn : STORAGE_KEYS.lastCheckOut;
    const lastSuccess = localStorage.getItem(storageKey);

    if (lastSuccess && Date.now() - Number(lastSuccess) < COOLDOWN_MS) {
      showAlert("이미 처리되었습니다");
      return;
    }

    setProcessingType(type);

    try {
      const site = getSiteByName(siteName);
      if (!site) {
        showAlert("출근 장소를 다시 선택해 주세요.");
        return;
      }

      const position = await getCurrentPosition();
      const { latitude: lat, longitude: lng } = position.coords;
      const distance = getDistanceMeters(lat, lng, site.lat, site.lng);

      if (distance > ALLOWED_RADIUS_M) {
        showAlert(
          `현장(${site.name})에서 ${Math.round(distance)}m 떨어져 있습니다.\n${ALLOWED_RADIUS_M}m 이내에서만 출퇴근할 수 있습니다.`
        );
        return;
      }

      await addDoc(collection(db, "attendance_logs"), {
        userName,
        siteName: site.name,
        type,
        lat,
        lng,
        distance: Math.round(distance),
        createdAt: serverTimestamp(),
      });

      localStorage.setItem(storageKey, String(Date.now()));
      showAlert(type === "CHECK_IN" ? "출근 처리되었습니다." : "퇴근 처리되었습니다.");
    } catch (error) {
      const message =
        error.code === 1
          ? "GPS 권한이 필요합니다. 위치 권한을 허용해 주세요."
          : error.message || "처리 중 오류가 발생했습니다.";
      showAlert(message);
    } finally {
      setProcessingType(null);
    }
  };

  if (!isReady) {
    return (
      <main className="app-container">
        <div className="loading-screen">불러오는 중...</div>
      </main>
    );
  }

  if (!isRegistered) {
    return (
      <main className="app-container">
        <div className="setup-card">
          <h1 className="app-title">출퇴근 등록</h1>
          <p className="app-subtitle">최초 1회 이름과 출근 장소를 입력해 주세요.</p>
          <form onSubmit={handleSetupSubmit} className="setup-form">
            <label className="field-label">
              이름
              <input
                type="text"
                className="field-input"
                value={setupName}
                onChange={(e) => setSetupName(e.target.value)}
                placeholder="홍길동"
                autoComplete="name"
              />
            </label>
            <label className="field-label">
              기본 출근 장소
              <select
                className="field-select"
                value={setupSite}
                onChange={(e) => setSetupSite(e.target.value)}
              >
                {SITES.map((site) => (
                  <option key={site.name} value={site.name}>
                    {site.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="btn btn-primary">
              저장하고 시작하기
            </button>
          </form>
        </div>
        {alert && <AlertModal message={alert} onClose={closeAlert} />}
      </main>
    );
  }

  const selectedSite = getSiteByName(siteName);

  return (
    <main className="app-container">
      <header className="profile-header">
        <div className="profile-row">
          <span className="profile-label">이름</span>
          {isEditingName ? (
            <div className="inline-edit">
              <input
                type="text"
                className="field-input field-input-sm"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                autoFocus
              />
              <button type="button" className="btn-text" onClick={handleSaveName}>
                저장
              </button>
              <button
                type="button"
                className="btn-text btn-text-muted"
                onClick={() => setIsEditingName(false)}
              >
                취소
              </button>
            </div>
          ) : (
            <div className="inline-edit">
              <span className="profile-value">{userName}</span>
              <button
                type="button"
                className="btn-text"
                onClick={() => {
                  setEditName(userName);
                  setIsEditingName(true);
                }}
              >
                수정
              </button>
            </div>
          )}
        </div>
        <div className="profile-row">
          <span className="profile-label">출근 장소</span>
          <select
            className="field-select field-select-inline"
            value={siteName}
            onChange={(e) => handleSiteChange(e.target.value)}
          >
            {SITES.map((site) => (
              <option key={site.name} value={site.name}>
                {site.name}
              </option>
            ))}
          </select>
        </div>
        {selectedSite && (
          <p className="site-hint">반경 {ALLOWED_RADIUS_M}m 이내에서만 출퇴근 가능</p>
        )}
      </header>

      <section className="action-section">
        <button
          type="button"
          className="btn btn-check-in"
          disabled={processingType !== null}
          onClick={() => handleAttendance("CHECK_IN")}
        >
          {processingType === "CHECK_IN" ? "처리 중..." : "출근하기"}
        </button>
        <div className="action-gap" aria-hidden="true" />
        <button
          type="button"
          className="btn btn-check-out"
          disabled={processingType !== null}
          onClick={() => handleAttendance("CHECK_OUT")}
        >
          {processingType === "CHECK_OUT" ? "처리 중..." : "퇴근하기"}
        </button>
      </section>

      {alert && <AlertModal message={alert} onClose={closeAlert} />}
    </main>
  );
}

function AlertModal({ message, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <p className="modal-message">{message}</p>
        <button type="button" className="btn btn-primary modal-btn" onClick={onClose}>
          확인
        </button>
      </div>
    </div>
  );
}
