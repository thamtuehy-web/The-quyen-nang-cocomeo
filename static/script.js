// CocoMeo Card Management System - Interactive Logic

let currentActiveCard = null;
let pendingSlotConfirm = null; // { cardId, slotIndex }
let allCardsCache = [];

// ==============================================================
// 1. REAL-TIME CLOCK (ĐỒNG HỒ MÁY TÍNH THỜI GIAN THỰC)
// ==============================================================
function pad(num) {
  return String(num).padStart(2, '0');
}

function formatDateTime(date) {
  const d = pad(date.getDate());
  const m = pad(date.getMonth() + 1);
  const y = date.getFullYear();
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  return {
    dateStr: `${d}/${m}/${y}`,
    timeStr: `${h}:${min}:${s}`,
    fullStr: `${d}/${m}/${y} ${h}:${min}:${s}`
  };
}

function updateLiveClock() {
  const now = new Date();
  const formatted = formatDateTime(now);

  const daysOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const dayName = daysOfWeek[now.getDay()];

  // Update Top Bar
  const dateEl = document.getElementById('realtimeDate');
  const clockEl = document.getElementById('realtimeClock');
  if (dateEl) dateEl.innerText = `${dayName}, ${formatted.dateStr}`;
  if (clockEl) clockEl.innerText = formatted.timeStr;

  // Update modal clock if open
  const modalClock = document.getElementById('confirmRealtimeClock');
  const modalDate = document.getElementById('confirmRealtimeDate');
  if (modalClock) modalClock.innerText = formatted.timeStr;
  if (modalDate) modalDate.innerText = `Ngày ${formatted.dateStr}`;

  // Update issue card modal clock
  const issueClock = document.getElementById('formRealtimeDisplay');
  if (issueClock && !document.getElementById('issueCardModal').classList.contains('hidden')) {
    issueClock.innerText = formatted.fullStr;
  }
}

// Chạy đồng hồ mỗi giây
setInterval(updateLiveClock, 1000);
updateLiveClock();

// ==============================================================
// 2. CHI NHÁNH & LOCAL STORAGE
// ==============================================================
function initBranch() {
  const savedBranch = localStorage.getItem('cocomeo_active_branch') || 'CS1 Hoà Xuân';
  const selectEl = document.getElementById('currentBranchSelect');
  if (selectEl) {
    selectEl.value = savedBranch;
  }
  const formBranch = document.getElementById('formBranch');
  if (formBranch) {
    formBranch.value = savedBranch;
  }
}

function changeActiveBranch(branchName) {
  localStorage.setItem('cocomeo_active_branch', branchName);
  const formBranch = document.getElementById('formBranch');
  if (formBranch) {
    formBranch.value = branchName;
  }
  Swal.fire({
    toast: true,
    position: 'top-end',
    icon: 'success',
    title: `Đã chọn: ${branchName}`,
    showConfirmButton: false,
    timer: 2000
  });
}

function getActiveBranch() {
  return localStorage.getItem('cocomeo_active_branch') || 'CS1 Hoà Xuân';
}

// ==============================================================
// 3. MỞ THẺ MỚI (TẠO THẺ)
// ==============================================================
async function openCardActionModal(cardType) {
  const modal = document.getElementById('issueCardModal');
  const title = document.getElementById('modalTitle');
  const subtitle = document.getElementById('modalSubtitle');
  const typeBadge = document.getElementById('modalTypeBadge');
  const superNotice = document.getElementById('formSuperExpiryNotice');
  const typeInput = document.getElementById('formCardType');
  const powerSubtypeContainer = document.getElementById('formPowerSubtypeContainer');

  typeInput.value = cardType;

  // Lấy số thẻ tiếp theo (1-9999)
  try {
    const res = await fetch(`/api/next-number/${cardType}`);
    const data = await res.json();
    document.getElementById('formNextNumberDisplay').innerText = `#${data.formatted}`;
  } catch (e) {
    document.getElementById('formNextNumberDisplay').innerText = '#0001';
  }

  // Cài đặt chi nhánh mặc định
  document.getElementById('formBranch').value = getActiveBranch();

  // Reset các ô input
  document.getElementById('formChildName').value = '';
  document.getElementById('formParentName').value = '';
  document.getElementById('formPhone').value = '';

  // Tính ngày hết hạn nếu là Siêu Quyền Năng
  const now = new Date();
  const expDate = new Date();
  expDate.setDate(now.getDate() + 30);
  const expFmt = formatDateTime(expDate);

  if (cardType === 'power') {
    title.innerText = 'Mở Thẻ Mới: THẺ QUYỀN NĂNG';
    subtitle.innerText = 'Thẻ 6 ô tròn tích lượt sử dụng • Tự động nhảy số 1-9999';
    typeBadge.className = 'w-10 h-10 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold';
    typeBadge.innerHTML = '<i data-lucide="zap" class="w-5 h-5"></i>';
    superNotice.classList.add('hidden');
    if (powerSubtypeContainer) {
      powerSubtypeContainer.classList.remove('hidden');
      const defaultRadio = document.querySelector('input[name="powerSubtypeRadio"][value="Vé Vui Chơi"]');
      if (defaultRadio) {
        defaultRadio.checked = true;
        onSubtypeRadioChange(defaultRadio);
      }
    }
  } else {
    title.innerText = 'Mở Thẻ Mới: THẺ SIÊU QUYỀN NĂNG';
    subtitle.innerText = 'Thời hạn 30 ngày vui chơi thỏa thích • Tự động hết hạn';
    typeBadge.className = 'w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold';
    typeBadge.innerHTML = '<i data-lucide="crown" class="w-5 h-5"></i>';
    superNotice.classList.remove('hidden');
    if (powerSubtypeContainer) {
      powerSubtypeContainer.classList.add('hidden');
    }
    document.getElementById('formCalcExpiryDate').innerText = expFmt.fullStr;
  }

  lucide.createIcons();
  updateLiveClock();
  modal.classList.remove('hidden');
}

function onSubtypeRadioChange(radio) {
  const group = document.getElementById('formPowerSubtypeGroup');
  if (!group) return;
  const labels = group.querySelectorAll('.subtype-option-label');
  labels.forEach(lbl => {
    const input = lbl.querySelector('input');
    if (input && input.checked) {
      lbl.className = 'subtype-option-label flex flex-col items-center justify-center p-2.5 rounded-xl border-2 border-amber-500 bg-white cursor-pointer shadow-sm transition text-center';
    } else {
      lbl.className = 'subtype-option-label flex flex-col items-center justify-center p-2.5 rounded-xl border border-slate-200 bg-white cursor-pointer hover:border-amber-400 transition text-center';
    }
  });
}

function closeIssueModal() {
  document.getElementById('issueCardModal').classList.add('hidden');
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const cardType = document.getElementById('formCardType').value;
  const branch = document.getElementById('formBranch').value;
  const childName = document.getElementById('formChildName').value.trim();
  const parentName = document.getElementById('formParentName').value.trim();
  const phone = document.getElementById('formPhone').value.trim();
  const powerSubtype = cardType === 'power'
    ? (document.querySelector('input[name="powerSubtypeRadio"]:checked')?.value || 'Vé Vui Chơi')
    : null;

  if (!childName || !parentName) {
    Swal.fire('Thiếu thông tin', 'Vui lòng nhập đầy đủ Tên bé và Tên Phụ Huynh', 'warning');
    return;
  }

  const btnSubmit = document.getElementById('btnSubmitIssue');
  btnSubmit.disabled = true;
  btnSubmit.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> <span>Đang xử lý...</span>`;
  lucide.createIcons();

  try {
    const res = await fetch('/api/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        card_type: cardType,
        branch: branch,
        child_name: childName,
        parent_name: parentName,
        phone: phone,
        power_subtype: powerSubtype
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Có lỗi xảy ra khi tạo thẻ');
    }

    closeIssueModal();

    // Hiệu ứng ăn mừng bằng confetti
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch (err) {}

    Swal.fire({
      icon: 'success',
      title: 'Mở Thẻ Thành Công!',
      html: `Đã mở thẻ <b>#${String(data.card.card_number).padStart(4, '0')}</b> cho bé <b>${data.card.child_name}</b>`,
      timer: 2500,
      showConfirmButton: false
    });

    // Tự động mở hiển thị chi tiết tấm thẻ vừa tạo
    displayActiveCard(data.card);
    // Tải lại danh sách bảng
    fetchCards();

  } catch (error) {
    Swal.fire('Lỗi', error.message, 'error');
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i> <span>Xác Nhận Mở Thẻ</span>`;
    lucide.createIcons();
  }
}

// ==============================================================
// 4. HIỂN THỊ TẤM THẺ HÌNH CHỮ NHẬT (CARD DISPLAY)
// ==============================================================
function displayActiveCard(card) {
  currentActiveCard = card;

  const section = document.getElementById('activeCardSection');
  const cardEl = document.getElementById('physicalCardElement');
  const heading = document.getElementById('activeCardHeading');
  const icon = document.getElementById('activeCardIcon');

  const watermarkOverlay = document.getElementById('cardWatermarkOverlay');
  const watermarkText = document.getElementById('cardWatermarkText');

  const typeLabel = document.getElementById('cardTypeLabel');
  const seqDisplay = document.getElementById('cardSequenceDisplay');
  const branchDisplay = document.getElementById('cardBranchDisplay');
  const childNameDisplay = document.getElementById('cardChildNameDisplay');
  const parentNameDisplay = document.getElementById('cardParentNameDisplay');
  const createdDateDisplay = document.getElementById('cardCreatedDateDisplay');

  const subtypeContainer = document.getElementById('cardSubtypeContainer');
  const subtypeDisplay = document.getElementById('cardSubtypeDisplay');
  const subtypeBadge = document.getElementById('cardSubtypeBadge');

  const slotsSection = document.getElementById('cardSlotsSection');
  const superSection = document.getElementById('cardSuperSection');
  const expiryContainer = document.getElementById('cardExpiryContainer');
  const expiryDateDisplay = document.getElementById('cardExpiryDateDisplay');

  // Điền thông tin chung
  seqDisplay.innerText = `#${String(card.card_number).padStart(4, '0')}`;
  branchDisplay.innerText = card.branch;
  childNameDisplay.innerText = card.child_name;
  parentNameDisplay.innerText = card.parent_name + (card.phone ? ` • SĐT: ${card.phone}` : '');
  createdDateDisplay.innerText = card.created_at;

  // Reset lớp theme
  cardEl.classList.remove('card-theme-power', 'card-theme-super');

  if (card.card_type === 'power') {
    // --- THẺ QUYỀN NĂNG ---
    cardEl.classList.add('card-theme-power');
    typeLabel.innerText = 'THẺ QUYỀN NĂNG (6 LƯỢT)';
    heading.innerText = `Thẻ Quyền Năng - #${String(card.card_number).padStart(4, '0')} (${card.child_name})`;
    icon.className = 'w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold';
    icon.innerHTML = '<i data-lucide="zap" class="w-5 h-5"></i>';

    // Hiển thị thông tin Loại Thẻ Quyền Năng dưới số thứ tự
    const subtype = card.power_subtype || 'Vé Vui Chơi';
    if (subtypeContainer) subtypeContainer.classList.remove('hidden');
    if (subtypeDisplay && subtypeBadge) {
      if (subtype === 'Combo 1') {
        subtypeBadge.className = 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-black tracking-wide bg-gradient-to-r from-amber-500/90 to-orange-500/90 backdrop-blur-sm border border-amber-300/40 text-yellow-100 shadow-sm';
        subtypeDisplay.innerText = 'COMBO 1 (10 XU)';
      } else if (subtype === 'Combo 2') {
        subtypeBadge.className = 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-black tracking-wide bg-gradient-to-r from-rose-500/90 to-pink-500/90 backdrop-blur-sm border border-pink-300/40 text-rose-100 shadow-sm';
        subtypeDisplay.innerText = 'COMBO 2 (NƯỚC + BIM BIM)';
      } else {
        subtypeBadge.className = 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-black tracking-wide bg-black/25 backdrop-blur-sm border border-white/20 text-yellow-300 shadow-sm';
        subtypeDisplay.innerText = 'VÉ VUI CHƠI';
      }
    }

    slotsSection.classList.remove('hidden');
    superSection.classList.add('hidden');
    expiryContainer.classList.add('hidden');

    renderPowerSlots(card);

    // Kiểm tra xem đã dùng hết cả 6 ô chưa
    const isCompleted = card.status === 'completed' || (card.slots && card.slots.every(s => s.used));
    if (isCompleted) {
      watermarkOverlay.classList.remove('hidden');
      watermarkText.innerText = 'THẺ ĐÃ HẾT LƯỢT SỬ DỤNG';
    } else {
      watermarkOverlay.classList.add('hidden');
    }

  } else {
    // --- THẺ SIÊU QUYỀN NĂNG ---
    if (subtypeContainer) subtypeContainer.classList.add('hidden');
    cardEl.classList.add('card-theme-super');
    typeLabel.innerText = 'THẺ SIÊU QUYỀN NĂNG (30 NGÀY)';
    heading.innerText = `Thẻ Siêu Quyền Năng - #${String(card.card_number).padStart(4, '0')} (${card.child_name})`;
    icon.className = 'w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold';
    icon.innerHTML = '<i data-lucide="crown" class="w-5 h-5"></i>';

    slotsSection.classList.add('hidden');
    superSection.classList.remove('hidden');
    expiryContainer.classList.remove('hidden');
    expiryDateDisplay.innerText = card.expires_at || 'Không xác định';

    // Kiểm tra quá hạn 30 ngày
    checkSuperCardExpiry(card);
  }

  // Render lịch sử thẻ
  renderCardLogs(card.logs || []);

  lucide.createIcons();
  section.classList.remove('hidden');
  scrollToSection('activeCardSection');
}

function closeActiveCard() {
  document.getElementById('activeCardSection').classList.add('hidden');
  currentActiveCard = null;
}

// ==============================================================
// 5. LOGIC 6 Ô TRÒN SỬ DỤNG LƯỢT & Ô VUÔNG COMBO
// ==============================================================
function renderPowerSlots(card) {
  const container = document.getElementById('slotsContainer');
  const countLabel = document.getElementById('slotsCountLabel');
  container.innerHTML = '';

  const slots = card.slots || [];
  let usedCount = 0;
  const isCombo = card.power_subtype === 'Combo 1' || card.power_subtype === 'Combo 2';

  slots.forEach((slot, idx) => {
    const slotNumber = idx + 1;
    const isUsed = slot.used;
    if (isUsed) usedCount++;

    // Cột dọc chứa quả bóng và ô vuông nhỏ bên dưới (nếu là combo)
    const col = document.createElement('div');
    col.className = 'slot-column';

    // 1. Quả bóng (Ô tròn trên)
    const circle = document.createElement('div');
    circle.className = `slot-circle ${isUsed ? 'used' : 'empty'}`;

    if (isUsed) {
      circle.innerHTML = `<span class="mark-x">✕</span>`;
      circle.title = `Lượt bóng ${slotNumber}: Đã dùng lúc ${slot.used_at || ''} (${slot.branch || ''})`;
    } else {
      circle.innerHTML = `<span class="text-xs font-black">${slotNumber}</span>`;
      circle.title = `Bấm để sử dụng lượt bóng ${slotNumber}`;
      circle.onclick = () => openSlotConfirmModal(card.id, slotNumber, card.child_name);
    }
    col.appendChild(circle);

    // 2. Ô vuông nhỏ hơn ngay phía dưới (Chỉ dành cho Thẻ Quyền Năng Combo)
    if (isCombo) {
      const square = document.createElement('div');
      const giftTaken = !!slot.gift_taken;
      square.className = `slot-square ${giftTaken ? 'taken' : 'intact'}`;

      if (giftTaken) {
        // Đã lấy quà: gạch chéo
        square.title = `Quà lượt ${slotNumber}: Đã lấy (${slot.gift_taken_at || ''}). Nhấp nếu muốn đổi lại trạng thái.`;
        square.onclick = () => promptToggleGiftDirectly(card.id, slotNumber, card.child_name, card.power_subtype, true);
      } else {
        // Khách chưa lấy: ô vuông còn nguyên vẹn đánh số thứ tự từ 1 tới 6 như quả bóng
        square.innerHTML = `<span>${slotNumber}</span>`;
        square.title = `Quà lượt ${slotNumber}: Khách chưa lấy. Nhấp để xác nhận khách lấy quà.`;
        square.onclick = () => promptToggleGiftDirectly(card.id, slotNumber, card.child_name, card.power_subtype, false);
      }
      col.appendChild(square);
    }

    container.appendChild(col);
  });

  const legend = document.getElementById('cardComboLegend');
  if (legend) {
    if (isCombo) {
      legend.classList.remove('hidden');
    } else {
      legend.classList.add('hidden');
    }
  }

  countLabel.innerText = isCombo
    ? `Đã dùng ${usedCount}/6 lượt bóng (Thẻ Combo kèm quà)`
    : `Đã dùng ${usedCount}/6 lượt`;
}

// Mở modal xác nhận với THỜI GIAN THỰC ĐỒNG HỒ MÁY TÍNH
function openSlotConfirmModal(cardId, slotIndex, childName) {
  pendingSlotConfirm = { cardId, slotIndex };

  const modal = document.getElementById('slotConfirmModal');
  document.getElementById('confirmChildName').innerText = childName;
  document.getElementById('confirmSlotNumber').innerText = slotIndex;
  document.getElementById('confirmBranchName').innerText = getActiveBranch();

  updateLiveClock();
  modal.classList.remove('hidden');
  lucide.createIcons();
}

function closeSlotConfirmModal() {
  document.getElementById('slotConfirmModal').classList.add('hidden');
  pendingSlotConfirm = null;
}

// Bấm nút "Xác Nhận" trong modal
async function executeSlotConfirm() {
  if (!pendingSlotConfirm) return;

  const { cardId, slotIndex } = pendingSlotConfirm;
  const currentBranch = getActiveBranch();

  const btn = document.getElementById('btnConfirmSlotAction');
  btn.disabled = true;
  btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> <span>Đang xác nhận...</span>`;

  try {
    const res = await fetch(`/api/cards/${cardId}/use-slot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slot_index: slotIndex,
        branch: currentBranch
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Có lỗi xảy ra');
    }

    closeSlotConfirmModal();

    // Nếu đây là ô thứ 6 (hết cả 6 lượt)
    if (data.all_used) {
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.5 }
        });
      } catch (err) {}

      Swal.fire({
        icon: 'info',
        title: 'THẺ ĐÃ HẾT LƯỢT SỬ DỤNG!',
        html: `Bé <b>${data.card.child_name}</b> đã hoàn thành toàn bộ 6 lượt chơi của Thẻ Quyền Năng.<br><span class="text-rose-600 font-bold">Thẻ đã được gạch mờ dấu X theo quy định.</span>`,
        confirmButtonColor: '#EF4444'
      });
    } else {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `Đã tích X lượt ${slotIndex} thành công!`,
        text: `Lúc ${data.used_at_slot}`,
        showConfirmButton: false,
        timer: 3000
      });
    }

    // Cập nhật lại giao diện thẻ
    await refreshCardDetail(cardId);
    // Cập nhật lại danh sách thẻ
    fetchCards();

    // Nếu là Thẻ Quyền Năng Combo (Combo 1 hoặc Combo 2)
    // Sau khi nhân viên ấn xong lượt thẻ là quả bóng, sẽ hiện ra một hội thoại là:
    // “Khách đã lấy 10 xu/ Nước + Bim Bim”
    if (data.is_combo) {
      setTimeout(() => {
        openComboGiftModal(cardId, slotIndex, data.card.child_name, data.power_subtype);
      }, 500);
    }

  } catch (err) {
    Swal.fire('Lỗi', err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="check" class="w-5 h-5"></i> <span>Xác Nhận</span>`;
    lucide.createIcons();
  }
}

// ==============================================================
// 5.1. LOGIC QUÀ TẶNG THẺ COMBO (10 XU / NƯỚC + BIM BIM)
// ==============================================================
let pendingComboGift = null; // { cardId, slotIndex, powerSubtype }

function openComboGiftModal(cardId, slotIndex, childName, powerSubtype) {
  pendingComboGift = { cardId, slotIndex, powerSubtype };
  const modal = document.getElementById('comboGiftModal');
  const promptEl = document.getElementById('comboGiftPromptText');
  const infoEl = document.getElementById('comboGiftSlotInfo');

  if (promptEl) {
    promptEl.innerText = '“Khách đã lấy 10 xu/ Nước + Bim Bim”';
  }
  if (infoEl) {
    infoEl.innerText = `Lượt bóng số ${slotIndex} (${powerSubtype}) • Bé ${childName}`;
  }

  modal.classList.remove('hidden');
  lucide.createIcons();
}

function closeComboGiftModal() {
  document.getElementById('comboGiftModal').classList.add('hidden');
  pendingComboGift = null;
}

async function handleComboGiftDecision(giftTaken) {
  if (!pendingComboGift) return;
  const { cardId, slotIndex, powerSubtype } = pendingComboGift;
  const branch = getActiveBranch();

  closeComboGiftModal();

  if (giftTaken) {
    try {
      const res = await fetch(`/api/cards/${cardId}/toggle-gift`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot_index: slotIndex,
          gift_taken: true,
          branch: branch
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Có lỗi xảy ra');

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: `Đã xác nhận lấy quà lượt ${slotIndex}!`,
        text: 'Ô vuông bên dưới quả bóng đã được gạch chéo.',
        showConfirmButton: false,
        timer: 2500
      });

      await refreshCardDetail(cardId);
      fetchCards();

    } catch (err) {
      Swal.fire('Lỗi', err.message, 'error');
    }
  } else {
    // Khách chưa lấy -> Ô vuông giữ nguyên vẹn
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'info',
      title: `Ghi nhận: Khách chưa lấy quà lượt ${slotIndex}`,
      text: 'Ô vuông nhỏ bên dưới vẫn giữ nguyên vẹn để khách lấy sau.',
      showConfirmButton: false,
      timer: 2500
    });
  }
}

function promptToggleGiftDirectly(cardId, slotIndex, childName, powerSubtype, currentTaken) {
  if (currentTaken) {
    Swal.fire({
      title: `Quà Lượt ${slotIndex} Đã Lấy`,
      html: `Quà lượt <b>${slotIndex}</b> của bé <b>${childName}</b> đã được gạch chéo.<br>Bạn có muốn đổi lại trạng thái sang <b>"Chưa Lấy"</b> không?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Đổi sang Chưa Lấy',
      cancelButtonText: 'Đóng',
      confirmButtonColor: '#F59E0B'
    }).then(async (res) => {
      if (res.isConfirmed) {
        await fetch(`/api/cards/${cardId}/toggle-gift`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slot_index: slotIndex, gift_taken: false, branch: getActiveBranch() })
        });
        await refreshCardDetail(cardId);
        fetchCards();
      }
    });
  } else {
    openComboGiftModal(cardId, slotIndex, childName, powerSubtype);
  }
}

// ==============================================================
// 6. LOGIC THẺ SIÊU QUYỀN NĂNG (30 NGÀY & GẠCH MỜ KHI HẾT HẠN)
// ==============================================================
function checkSuperCardExpiry(card) {
  const watermarkOverlay = document.getElementById('cardWatermarkOverlay');
  const watermarkText = document.getElementById('cardWatermarkText');
  const statusLabel = document.getElementById('superRemainingDays');

  const now = new Date();
  let isExpired = card.status === 'expired';

  if (card.expires_at) {
    // Chuyển string YYYY-MM-DD HH:MM:SS thành Date object
    const parts = card.expires_at.split(/[- :]/);
    const expDate = new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]);

    const diffMs = expDate - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs <= 0 || isExpired) {
      isExpired = true;
      watermarkOverlay.classList.remove('hidden');
      watermarkText.innerText = 'THẺ ĐÃ HẾT HẠN SỬ DỤNG';
      statusLabel.className = 'text-sm font-black text-rose-300 flex items-center gap-1';
      statusLabel.innerHTML = '<i data-lucide="alert-octagon" class="w-4 h-4"></i> <span>Thẻ đã hết hạn 30 ngày</span>';
    } else {
      watermarkOverlay.classList.add('hidden');
      statusLabel.className = 'text-sm font-black text-emerald-300 flex items-center gap-1';
      statusLabel.innerHTML = `<i data-lucide="shield-check" class="w-4 h-4"></i> <span>Còn hiệu lực (${diffDays} ngày nữa)</span>`;
    }
  }
}

// Check-in hàng ngày cho bé dùng thẻ Siêu Quyền Năng
async function handleSuperCheckin() {
  if (!currentActiveCard || currentActiveCard.card_type !== 'super') return;

  const currentBranch = getActiveBranch();

  try {
    const res = await fetch(`/api/cards/${currentActiveCard.id}/checkin-super`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        branch: currentBranch,
        note: 'Check-in vui chơi trong ngày'
      })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Có lỗi xảy ra');
    }

    Swal.fire({
      icon: 'success',
      title: 'Check-in Thành Công!',
      text: `${data.message} (${data.used_at})`,
      timer: 2500,
      showConfirmButton: false
    });

    await refreshCardDetail(currentActiveCard.id);

  } catch (err) {
    Swal.fire('Không thể check-in', err.message, 'error');
  }
}

// Nút Test Bật/Tắt hết hạn demo cho Thẻ Siêu Quyền Năng
async function toggleExpireDemo() {
  if (!currentActiveCard || currentActiveCard.card_type !== 'super') return;

  try {
    const res = await fetch(`/api/cards/${currentActiveCard.id}/toggle-expire-demo`, {
      method: 'POST'
    });
    const data = await res.json();
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'info',
      title: data.message,
      showConfirmButton: false,
      timer: 2000
    });
    await refreshCardDetail(currentActiveCard.id);
    fetchCards();
  } catch (err) {
    Swal.fire('Lỗi', err.message, 'error');
  }
}

// ==============================================================
// 7. LỊCH SỬ SỬ DỤNG THẺ
// ==============================================================
function renderCardLogs(logs) {
  const container = document.getElementById('cardLogsContainer');
  if (!logs || logs.length === 0) {
    container.innerHTML = `<div class="text-slate-400 italic py-2">Chưa có lượt sử dụng nào được ghi nhận.</div>`;
    return;
  }

  container.innerHTML = logs.map(log => {
    let actionBadge = '';
    if (log.action === 'use_slot') {
      actionBadge = `<span class="bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded">Tích X Ô Số ${log.slot_index}</span>`;
    } else {
      actionBadge = `<span class="bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded">Điểm danh Check-in</span>`;
    }

    return `
      <div class="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
        <div class="flex items-center gap-2">
          ${actionBadge}
          <span class="font-bold text-slate-700">${log.branch}</span>
        </div>
        <div class="font-mono text-slate-500 font-semibold">
          ${log.used_at}
        </div>
      </div>
    `;
  }).join('');
}

async function refreshCardDetail(cardId) {
  try {
    const res = await fetch(`/api/cards/${cardId}`);
    const card = await res.json();
    displayActiveCard(card);
  } catch (err) {
    console.error(err);
  }
}

// ==============================================================
// 8. TẢI VÀ LỌC DANH SÁCH THẺ (CARDS TABLE)
// ==============================================================
async function fetchCards() {
  if (!isAppLoggedIn()) return;

  const branch = document.getElementById('filterBranch').value;
  const type = document.getElementById('filterType').value;
  const status = document.getElementById('filterStatus').value;
  const search = document.getElementById('searchInput').value;

  const params = new URLSearchParams({
    branch: branch,
    type: type === 'all' ? '' : type,
    status: status === 'all' ? '' : status,
    search: search
  });

  try {
    const res = await fetch(`/api/cards?${params.toString()}`);
    const cards = await res.json();
    allCardsCache = cards;
    renderCardsTable(cards);
  } catch (err) {
    console.error('Lỗi tải danh sách thẻ:', err);
  }
}

function filterCards() {
  fetchCards();
}

function renderCardsTable(cards) {
  const tbody = document.getElementById('cardsTableBody');
  if (!cards || cards.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-8 text-slate-400">
          Chưa có thẻ nào phù hợp với bộ lọc tìm kiếm.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = cards.map(c => {
    const isPower = c.card_type === 'power';
    const numDisplay = `#${String(c.card_number).padStart(4, '0')}`;

    // Tag loại thẻ
    let typeBadge = '';
    if (isPower) {
      const sub = c.power_subtype || 'Vé Vui Chơi';
      let subBadge = '';
      if (sub === 'Combo 1') subBadge = `<span class="text-[10px] text-amber-800 font-extrabold bg-amber-100 px-1.5 py-0.5 rounded w-fit border border-amber-200">Combo 1 (10 xu)</span>`;
      else if (sub === 'Combo 2') subBadge = `<span class="text-[10px] text-pink-800 font-extrabold bg-pink-100 px-1.5 py-0.5 rounded w-fit border border-pink-200">Combo 2 (Nước+Bim)</span>`;
      else subBadge = `<span class="text-[10px] text-slate-500 font-semibold w-fit">Vé Vui Chơi</span>`;

      typeBadge = `
        <div class="flex flex-col gap-1">
          <span class="bg-orange-100 text-orange-700 font-bold px-2 py-0.5 rounded-lg text-xs flex items-center gap-1 w-fit"><i data-lucide="zap" class="w-3.5 h-3.5"></i> Quyền Năng</span>
          ${subBadge}
        </div>
      `;
    } else {
      typeBadge = `<span class="bg-purple-100 text-purple-700 font-bold px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 w-fit"><i data-lucide="crown" class="w-3.5 h-3.5"></i> Siêu Quyền Năng</span>`;
    }

    // Tiến độ
    let progressDisplay = '';
    if (isPower) {
      const usedCount = (c.slots || []).filter(s => s.used).length;
      progressDisplay = `<div class="font-bold text-xs">${usedCount}/6 lượt</div>`;
    } else {
      progressDisplay = `<div class="text-[11px] font-mono text-slate-600">Hạn: ${c.expires_at || ''}</div>`;
    }

    // Trạng thái
    let statusBadge = '';
    if (c.status === 'completed') {
      statusBadge = `<span class="bg-rose-100 text-rose-700 font-black px-2 py-0.5 rounded text-[11px]">HẾT 6 LƯỢT</span>`;
    } else if (c.status === 'expired') {
      statusBadge = `<span class="bg-slate-200 text-slate-700 font-black px-2 py-0.5 rounded text-[11px]">HẾT HẠN 30 NGÀY</span>`;
    } else {
      statusBadge = `<span class="bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded text-[11px]">Đang Hoạt Động</span>`;
    }

    return `
      <tr class="hover:bg-slate-50/80 transition">
        <td class="py-3 px-4 font-mono font-black text-pink-600">${numDisplay}</td>
        <td class="py-3 px-4">${typeBadge}</td>
        <td class="py-3 px-4">
          <div class="font-bold text-slate-800">${c.child_name}</div>
          <div class="text-xs text-slate-500">${c.parent_name} ${c.phone ? '• ' + c.phone : ''}</div>
        </td>
        <td class="py-3 px-4 font-semibold text-xs text-slate-700">${c.branch}</td>
        <td class="py-3 px-4 font-mono text-xs text-slate-500">${c.created_at}</td>
        <td class="py-3 px-4">${progressDisplay}</td>
        <td class="py-3 px-4">${statusBadge}</td>
        <td class="py-3 px-4 text-center">
          <div class="flex items-center justify-center gap-1.5">
            <button onclick="viewCardById(${c.id})" class="px-2.5 py-1.5 bg-pink-50 hover:bg-pink-100 text-pink-600 font-bold rounded-xl text-xs flex items-center gap-1 transition">
              <i data-lucide="eye" class="w-3.5 h-3.5"></i>
              <span>Xem & Tích</span>
            </button>
            <button onclick="confirmDeleteCard(${c.id}, '${c.child_name.replace(/'/g, "\\'")}', ${c.card_number})" class="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl text-xs transition" title="Xóa thẻ (Yêu cầu Admin)">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  lucide.createIcons();
}

async function viewCardById(id) {
  try {
    const res = await fetch(`/api/cards/${id}`);
    const card = await res.json();
    displayActiveCard(card);
  } catch (err) {
    Swal.fire('Lỗi', 'Không thể tải chi tiết thẻ', 'error');
  }
}

// In thẻ (Physical print)
function printCurrentCard() {
  window.print();
}

// Cuộn mượt đến mục chỉ định
function scrollToSection(sectionId) {
  const el = document.getElementById(sectionId);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' });
  }
}

function refreshData() {
  fetchCards();
  Swal.fire({
    toast: true,
    position: 'top-end',
    icon: 'success',
    title: 'Đã cập nhật dữ liệu mới nhất!',
    showConfirmButton: false,
    timer: 1500
  });
}

// ==============================================================
// 9. QUẢN TRỊ VIÊN & XÓA DỮ LIỆU THẺ (ADMIN ONLY)
// Tài khoản: cocomeo | Mật khẩu: 12121990
// ==============================================================
let pendingAdminCallback = null;

function isAdminLoggedIn() {
  return !!sessionStorage.getItem('cocomeo_admin_token');
}

function updateAdminUI() {
  const container = document.getElementById('adminBadgeContainer');
  if (!container) return;

  if (isAdminLoggedIn()) {
    container.innerHTML = `
      <div onclick="adminLogout()" class="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition shadow-sm" title="Đang ở quyền Admin. Nhấp để Đăng xuất">
        <i data-lucide="shield-check" class="w-4 h-4 text-rose-600"></i>
        <span>Admin: cocomeo (Đăng xuất)</span>
      </div>
    `;
  } else {
    container.innerHTML = `
      <div onclick="openAdminLoginModal()" class="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition" title="Nhân viên sử dụng bình thường. Nhấp nếu cần đăng nhập Admin để xóa thẻ">
        <i data-lucide="shield" class="w-4 h-4 text-slate-400"></i>
        <span>Nhân viên</span>
      </div>
    `;
  }
  lucide.createIcons();
}

function openAdminLoginModal(callback = null) {
  pendingAdminCallback = callback;
  const modal = document.getElementById('adminLoginModal');
  document.getElementById('adminUsernameInput').value = 'cocomeo';
  document.getElementById('adminPasswordInput').value = '';
  modal.classList.remove('hidden');
  setTimeout(() => {
    document.getElementById('adminPasswordInput').focus();
  }, 100);
}

function closeAdminLoginModal() {
  document.getElementById('adminLoginModal').classList.add('hidden');
  pendingAdminCallback = null;
}

async function handleAdminLoginSubmit(e) {
  e.preventDefault();
  const username = document.getElementById('adminUsernameInput').value.trim();
  const password = document.getElementById('adminPasswordInput').value.trim();

  const btn = document.getElementById('btnAdminLoginSubmit');
  btn.disabled = true;
  btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> <span>Đang kiểm tra...</span>`;
  lucide.createIcons();

  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Tên đăng nhập hoặc mật khẩu không chính xác!');
    }

    sessionStorage.setItem('cocomeo_admin_token', data.token);
    closeAdminLoginModal();
    updateAdminUI();

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Đăng nhập Admin thành công!',
      text: 'Bạn có quyền thực hiện thao tác xóa dữ liệu thẻ.',
      showConfirmButton: false,
      timer: 2500
    });

    if (pendingAdminCallback) {
      const cb = pendingAdminCallback;
      pendingAdminCallback = null;
      cb();
    }

  } catch (err) {
    Swal.fire('Đăng nhập thất bại', err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="key" class="w-4 h-4"></i> <span>Đăng Nhập</span>`;
    lucide.createIcons();
  }
}

function adminLogout() {
  sessionStorage.removeItem('cocomeo_admin_token');
  updateAdminUI();
  Swal.fire({
    toast: true,
    position: 'top-end',
    icon: 'info',
    title: 'Đã thoát tài khoản Admin',
    text: 'Đã trở về chế độ Nhân viên thông thường.',
    showConfirmButton: false,
    timer: 2000
  });
}

function requireAdminAuth(callback) {
  if (isAdminLoggedIn()) {
    callback();
  } else {
    openAdminLoginModal(callback);
  }
}

function confirmDeleteCard(cardId, childName, cardNumber) {
  requireAdminAuth(() => {
    Swal.fire({
      title: 'Xóa Thẻ Này?',
      html: `Bạn có chắc chắn muốn xóa vĩnh viễn thẻ <b>#${String(cardNumber).padStart(4, '0')}</b> của bé <b>${childName}</b> không?<br><span class="text-xs text-rose-600 font-bold">Thao tác này sẽ xóa toàn bộ thẻ và lịch sử sử dụng khỏi hệ thống!</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#64748B',
      confirmButtonText: 'Đồng ý xóa',
      cancelButtonText: 'Hủy bỏ'
    }).then(async (result) => {
      if (result.isConfirmed) {
        await executeDeleteCard(cardId);
      }
    });
  });
}

async function executeDeleteCard(cardId) {
  const token = sessionStorage.getItem('cocomeo_admin_token');

  try {
    const res = await fetch(`/api/cards/${cardId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Token': token
      }
    });

    const data = await res.json();
    if (!res.ok) {
      if (res.status === 403) {
        adminLogout();
        requireAdminAuth(() => executeDeleteCard(cardId));
        return;
      }
      throw new Error(data.error || 'Có lỗi xảy ra khi xóa thẻ');
    }

    Swal.fire({
      icon: 'success',
      title: 'Đã Xóa Thẻ Thành Công!',
      text: data.message,
      timer: 2000,
      showConfirmButton: false
    });

    // Nếu đang mở xem chính thẻ vừa xóa, hãy đóng lại
    if (currentActiveCard && currentActiveCard.id === cardId) {
      closeActiveCard();
    }

    fetchCards();

  } catch (err) {
    Swal.fire('Lỗi xóa thẻ', err.message, 'error');
  }
}

function handleDeleteActiveCard() {
  if (!currentActiveCard) return;
  confirmDeleteCard(currentActiveCard.id, currentActiveCard.child_name, currentActiveCard.card_number);
}

// ==============================================================
// 10. HỆ THỐNG ĐĂNG NHẬP VÀO APP BẢO MẬT & QUÊN MẬT KHẨU
// Tên đăng nhập: cocomeo | Mật khẩu: Meo1234*
// ==============================================================
function isAppLoggedIn() {
  return !!(localStorage.getItem('cocomeo_app_session') || sessionStorage.getItem('cocomeo_app_session'));
}

function getAppAuthUsername() {
  return localStorage.getItem('cocomeo_auth_username') || sessionStorage.getItem('cocomeo_auth_username') || 'cocomeo';
}

function updateAppAuthUI() {
  const container = document.getElementById('userAuthBadgeContainer');
  const mainWrapper = document.getElementById('mainAppWrapper');
  const loginModal = document.getElementById('appLoginModal');

  if (isAppLoggedIn()) {
    if (loginModal) loginModal.classList.add('hidden');
    if (mainWrapper) {
      mainWrapper.classList.remove('filter', 'blur-sm', 'pointer-events-none', 'opacity-30');
    }
    if (container) {
      const username = getAppAuthUsername();
      container.innerHTML = `
        <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-xs" title="Tài khoản đang đăng nhập">
          <i data-lucide="shield-check" class="w-3.5 h-3.5 text-amber-600"></i>
          <span>${username}</span>
        </span>
      `;
    }
  } else {
    if (loginModal) loginModal.classList.remove('hidden');
    if (mainWrapper) {
      mainWrapper.classList.add('filter', 'blur-sm', 'pointer-events-none', 'opacity-30');
    }
    if (container) {
      container.innerHTML = '';
    }
  }
  lucide.createIcons();
}

async function handleAppLoginSubmit(e) {
  e.preventDefault();
  const username = document.getElementById('appUsernameInput').value.trim();
  const password = document.getElementById('appPasswordInput').value.trim();
  const remember = document.getElementById('rememberLoginCheck')?.checked;

  if (!username || !password) {
    Swal.fire('Thiếu thông tin', 'Vui lòng nhập tên đăng nhập và mật khẩu', 'warning');
    return;
  }

  const btn = document.getElementById('btnAppLoginSubmit');
  btn.disabled = true;
  btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> <span>Đang xác thực...</span>`;
  lucide.createIcons();

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Tên đăng nhập hoặc mật khẩu không chính xác!');
    }

    const storage = remember ? localStorage : sessionStorage;
    storage.setItem('cocomeo_app_session', data.token);
    storage.setItem('cocomeo_auth_username', data.username);
    // Lưu quyền xóa dữ liệu thẻ
    sessionStorage.setItem('cocomeo_admin_token', 'cocomeo-admin-authorized-session');

    updateAppAuthUI();
    updateAdminUI();
    document.getElementById('appPasswordInput').value = '';

    try {
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    } catch(err) {}

    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'Đăng nhập thành công!',
      text: `Chào mừng ${data.username} đến với Hệ thống CocoMeo!`,
      showConfirmButton: false,
      timer: 2500
    });

    await fetchCards();
    if (allCardsCache && allCardsCache.length > 0) {
      displayActiveCard(allCardsCache[0]);
    }

  } catch (err) {
    Swal.fire('Đăng nhập thất bại', err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="log-in" class="w-5 h-5"></i> <span>Đăng Nhập Vào Hệ Thống</span>`;
    lucide.createIcons();
  }
}

function handleAppLogout() {
  Swal.fire({
    title: 'Đăng Xuất?',
    text: 'Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng CocoMeo?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#E11D48',
    cancelButtonColor: '#94A3B8',
    confirmButtonText: 'Đăng Xuất Ngay',
    cancelButtonText: 'Ở lại'
  }).then((res) => {
    if (res.isConfirmed) {
      localStorage.removeItem('cocomeo_app_session');
      localStorage.removeItem('cocomeo_auth_username');
      sessionStorage.removeItem('cocomeo_app_session');
      sessionStorage.removeItem('cocomeo_auth_username');
      sessionStorage.removeItem('cocomeo_admin_token');

      updateAppAuthUI();
      closeActiveCard();

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'info',
        title: 'Đã đăng xuất',
        text: 'Hệ thống đã được khóa để bảo mật thông tin.',
        showConfirmButton: false,
        timer: 2000
      });
    }
  });
}

function togglePasswordVisibility(inputId, btnEl) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const isPass = input.type === 'password';
  input.type = isPass ? 'text' : 'password';
  btnEl.innerHTML = isPass ? `<i data-lucide="eye-off" class="w-4 h-4"></i>` : `<i data-lucide="eye" class="w-4 h-4"></i>`;
  lucide.createIcons();
}

// ==============================================================
// 11. XỬ LÝ QUÊN MẬT KHẨU & GỬI EMAIL TỚI thamtuehy@gmail.com
// ==============================================================
function openForgotPasswordModal() {
  const modal = document.getElementById('forgotPasswordModal');
  document.getElementById('forgotStep1').classList.remove('hidden');
  document.getElementById('forgotStep2').classList.add('hidden');
  document.getElementById('resetOtpInput').value = '';
  document.getElementById('resetNewPasswordInput').value = '';
  document.getElementById('resetConfirmPasswordInput').value = '';
  const hintEl = document.getElementById('resetOtpDemoHint');
  if (hintEl) {
    hintEl.classList.add('hidden');
    hintEl.innerText = '';
  }
  modal.classList.remove('hidden');
  lucide.createIcons();
}

function closeForgotPasswordModal() {
  document.getElementById('forgotPasswordModal').classList.add('hidden');
}

function backToForgotStep1() {
  document.getElementById('forgotStep2').classList.add('hidden');
  document.getElementById('forgotStep1').classList.remove('hidden');
  lucide.createIcons();
}

async function handleSendResetOtp() {
  const email = document.getElementById('forgotEmailInput').value.trim() || 'thamtuehy@gmail.com';
  const btn = document.getElementById('btnSendOtpSubmit');

  btn.disabled = true;
  btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> <span>Đang gửi mã...</span>`;
  lucide.createIcons();

  try {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Có lỗi khi gửi mã OTP');
    }

    Swal.fire({
      icon: 'success',
      title: 'Đã Gửi Mã Xác Nhận!',
      html: `Mã OTP đã được gửi tới email <b>${data.email}</b>.<br><small class="text-slate-500">Vui lòng kiểm tra hộp thư để lấy mã 6 số tạo mật khẩu mới.</small>`,
      confirmButtonText: 'Nhập Mã OTP Ngay',
      confirmButtonColor: '#F97316'
    });

    document.getElementById('forgotStep1').classList.add('hidden');
    document.getElementById('forgotStep2').classList.remove('hidden');

    const hintEl = document.getElementById('resetOtpDemoHint');
    if (hintEl && data.demo_otp) {
      hintEl.classList.remove('hidden');
      hintEl.innerHTML = `🔑 Mã OTP gửi tới email (kiểm tra nhanh): <span class="text-sm font-mono text-red-600 bg-white px-1.5 py-0.5 rounded border border-amber-300 font-black">${data.demo_otp}</span>`;
      document.getElementById('resetOtpInput').value = data.demo_otp;
    }

    setTimeout(() => {
      document.getElementById('resetNewPasswordInput').focus();
    }, 200);

  } catch (err) {
    Swal.fire('Lỗi gửi email', err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="send" class="w-4 h-4"></i> <span>Gửi Mã Về Email</span>`;
    lucide.createIcons();
  }
}

async function handleConfirmPasswordReset() {
  const email = document.getElementById('forgotEmailInput').value.trim() || 'thamtuehy@gmail.com';
  const otp = document.getElementById('resetOtpInput').value.trim();
  const newPass = document.getElementById('resetNewPasswordInput').value.trim();
  const confirmPass = document.getElementById('resetConfirmPasswordInput').value.trim();

  if (!otp || otp.length < 4) {
    Swal.fire('Mã OTP không hợp lệ', 'Vui lòng nhập đầy đủ mã xác nhận gồm 6 số đã gửi về email!', 'warning');
    return;
  }

  if (!newPass) {
    Swal.fire('Thiếu mật khẩu', 'Vui lòng nhập mật khẩu mới!', 'warning');
    return;
  }

  if (newPass !== confirmPass) {
    Swal.fire('Mật khẩu không khớp', 'Mật khẩu xác nhận không trùng khớp với mật khẩu mới. Vui lòng kiểm tra lại!', 'warning');
    return;
  }

  const btn = document.getElementById('btnConfirmResetSubmit');
  btn.disabled = true;
  btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> <span>Đang cập nhật...</span>`;
  lucide.createIcons();

  try {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        otp: otp,
        new_password: newPass
      })
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Có lỗi xảy ra khi cập nhật mật khẩu');
    }

    closeForgotPasswordModal();

    // Tự động điền mật khẩu mới vừa đổi vào ô đăng nhập
    document.getElementById('appPasswordInput').value = newPass;

    Swal.fire({
      icon: 'success',
      title: 'Tạo Mật Khẩu Mới Thành Công!',
      html: `Đã cập nhật mật khẩu mới cho tài khoản <b>cocomeo</b>.<br>Bạn có thể bấm <b>Đăng Nhập</b> ngay bây giờ!`,
      confirmButtonText: 'Đăng Nhập Ngay',
      confirmButtonColor: '#F97316'
    });

  } catch (err) {
    Swal.fire('Không thể đổi mật khẩu', err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i> <span>Tạo Mật Khẩu Mới</span>`;
    lucide.createIcons();
  }
}

// ==============================================================
// KHỞI ĐỘNG HỆ THỐNG
// ==============================================================
document.addEventListener('DOMContentLoaded', async () => {
  initBranch();
  updateAppAuthUI();
  updateAdminUI();

  if (isAppLoggedIn()) {
    await fetchCards();
    if (allCardsCache && allCardsCache.length > 0) {
      displayActiveCard(allCardsCache[0]);
    }
  }

  lucide.createIcons();
});
