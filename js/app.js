const app = {
    // App State with Persistence
    userBalance: parseInt(localStorage.getItem('joycare_balance')) || 1250000,
    userPoints: parseInt(localStorage.getItem('joycare_points')) || 2450,
    bookingDone: false,   // true only after a booking is confirmed & paid
    currentBooking: {
        serviceId: 'home',
        price: 0,
        hours: 1,
        title: 'Joy-Home'
    },

    saveState: function () {
        localStorage.setItem('joycare_balance', this.userBalance);
        localStorage.setItem('joycare_points', this.userPoints);
    },

    navigate: function (screenId) {
        const screens = document.querySelectorAll('.screen');
        screens.forEach((s) => { s.classList.remove('active'); s.style.display = 'none'; });
        const target = document.getElementById('screen-' + screenId);
        if (target) {
            target.classList.add('active');
            if (screenId === 'finding') target.style.display = 'flex';
            else if (screenId === 'support') target.style.display = 'flex';
            else target.style.display = 'block';
        }
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        const navTarget = document.querySelector(`.nav-item[data-target="${screenId}"]`);
        if (navTarget) navTarget.classList.add('active');
        const noNavScreens = ['login', 'vneid', 'finding', 'matched', 'confirm', 'register', 'support', 'family-profile', 'tracking', 'payment', 'payment-success', 'thankyou'];
        const bottomNav = document.querySelector('.bottom-nav');
        if (bottomNav) bottomNav.style.display = noNavScreens.includes(screenId) ? 'none' : 'flex';

        // Gate tracking screen: only show content when booking is done
        if (screenId === 'tracking') {
            const gate = document.getElementById('tracking-no-booking-gate');
            if (gate) {
                if (!this.bookingDone) {
                    gate.style.display = 'flex';
                } else {
                    gate.style.display = 'none';
                }
            }
        }

        // Always sync UI when navigating
        this.updateWalletUI();
    },

    updateWalletUI: function () {
        const balanceEl = document.getElementById('header-balance');
        const pointsEl = document.getElementById('header-points');
        const profileBalanceEl = document.getElementById('profile-balance');
        const formattedBalance = this.userBalance.toLocaleString('vi-VN') + 'đ';

        if (balanceEl) balanceEl.innerText = formattedBalance;
        if (profileBalanceEl) profileBalanceEl.innerText = formattedBalance;
        if (pointsEl) pointsEl.innerText = this.userPoints.toLocaleString('vi-VN');
    },

    toggleTheme: function () {
        const isLight = document.documentElement.classList.toggle('light-theme');
        localStorage.setItem('joycare_theme', isLight ? 'light' : 'dark');
        const icon = document.getElementById('theme-icon');
        if (icon) {
            if (isLight) {
                icon.className = 'fa-solid fa-sun';
                icon.style.color = '#FFD700'; // Gold/yellow for sun
            } else {
                icon.className = 'fa-solid fa-moon';
                icon.style.color = 'white';
            }
        }
    },

    switchAuthTab: function (tab) {
        const loginBtn = document.getElementById('tab-login');
        const regBtn = document.getElementById('tab-register');
        const loginPanel = document.getElementById('panel-login');
        const regPanel = document.getElementById('panel-register');
        if (tab === 'login') {
            loginBtn.style.color = 'var(--primary-blue)'; loginBtn.style.borderBottom = '3px solid var(--primary-blue)';
            regBtn.style.color = 'var(--text-secondary)'; regBtn.style.borderBottom = '3px solid transparent';
            loginPanel.style.display = 'block'; regPanel.style.display = 'none';
        } else {
            regBtn.style.color = 'var(--primary-blue)'; regBtn.style.borderBottom = '3px solid var(--primary-blue)';
            loginBtn.style.color = 'var(--text-secondary)'; loginBtn.style.borderBottom = '3px solid transparent';
            regPanel.style.display = 'block'; loginPanel.style.display = 'none';
        }
    },

    showVNeIDScan: function () {
        const modal = document.getElementById('nfc-modal');
        const scanLine = document.getElementById('nfc-scan-line');
        if (!modal || !scanLine) return;

        modal.style.display = 'block';
        scanLine.style.display = 'block';

        const title = modal.querySelector('h3');
        const desc = modal.querySelector('p');

        // Phase 1: Ready to scan
        title.innerText = 'Sẵn sàng quét';
        desc.innerText = 'Giữ mặt sau CCCD gắn chip sát vào phần trên của điện thoại';

        // Phase 2: Scanning
        setTimeout(() => {
            title.innerText = 'Đang đọc thông tin...';
            desc.innerText = 'Vui lòng không di chuyển CCCD';
            const icon = modal.querySelector('i.fa-nfc-symbol');
            if (icon) icon.style.color = 'var(--primary-orange)';
        }, 1500);

        // Phase 3: Success
        setTimeout(() => {
            scanLine.style.display = 'none';
            title.innerText = 'Xác thực thành công ✅';
            desc.innerHTML = '<span style="color:#34C759; font-weight:bold;">Đã xác minh định danh mức 2</span>';
            const icon = modal.querySelector('i');
            if (icon) {
                icon.className = 'fa-solid fa-check-circle';
                icon.style.color = '#34C759';
            }

            setTimeout(() => {
                modal.style.display = 'none';
                this.navigate('home');
                // Reset
                setTimeout(() => {
                    if (icon) {
                        icon.className = 'fa-solid fa-nfc-symbol';
                        icon.style.color = '#2B5EE2';
                    }
                }, 500);
            }, 1500);
        }, 3500);
    },

    sendSupportMessage: function () {
        const input = document.getElementById('support-input');
        if (!input || !input.value.trim()) return;
        this.supportReply(input.value.trim());
        input.value = '';
    },

    supportReply: function (question) {
        const history = document.getElementById('support-chat-history');
        if (!history) return;
        const timeNow = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        history.insertAdjacentHTML('beforeend', `
            <div style="display:flex;flex-direction:column;align-items:flex-end;margin-bottom:12px;">
                <div style="background:var(--primary-blue);color:white;padding:10px 14px;border-radius:18px;border-bottom-right-radius:4px;max-width:80%;font-size:13px;">${question}</div>
                <span style="font-size:10px;color:var(--text-secondary);margin-top:3px;">${timeNow}</span>
            </div>`);
        setTimeout(() => {
            history.insertAdjacentHTML('beforeend', `
                <div style="display:flex;align-items:flex-end;gap:8px;margin-bottom:12px;">
                    <div style="width:28px;height:28px;background:var(--danger-red);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fa-solid fa-headset" style="color:white;font-size:10px;"></i></div>
                    <div style="background:var(--bg-card);padding:10px 14px;border-radius:18px;border-bottom-left-radius:4px;max-width:80%;font-size:13px;color:white;line-height:1.5;">Cảm ơn bạn đã liên hệ! Nhân viên JoyCare sẽ phản hồi trong vòng 5 phút 🙏</div>
                </div>`);
            history.scrollTop = history.scrollHeight;
        }, 800);
        history.scrollTop = history.scrollHeight;
    },

    servicesData: {
        'hospital': { title: 'Joy-Hospital', tagline: 'Tháp tùng đi viện', isVip: false, desc: 'Hỗ trợ di chuyển, lấy số và xếp hàng tại bệnh viện.', features: ['Đặt xe và dìu đỡ tận nơi', 'Hỗ trợ lấy số thứ tự, sổ khám bệnh', 'Xếp hàng chờ lấy thuốc', 'Nhắc nhở lịch trình'], price: 110000, priceText: '110k/h' },
        'vip': { title: 'Hospital VIP', tagline: 'Trọn gói & Live Tracking', isVip: true, desc: 'Dịch vụ cao cấp, hỗ trợ toàn diện và báo cáo Live cho con cái.', features: ['Ưu tiên JoyPal EQ > 90', 'Cập nhật hình ảnh/video Live', 'Ghi chép lời dặn bác sĩ', 'Hỗ trợ thanh toán viện phí'], price: 450000, priceText: '450.000đ/ca' },
        'home': { title: 'Joy-Home', tagline: 'Trò chuyện tại nhà', isVip: false, desc: 'Giải tỏa cô đơn bằng những giờ bầu bạn ấm cúng.', features: ['Trò chuyện tâm giao', 'Đọc báo, xem TV, nghe nhạc xưa', 'Đi dạo quanh khu vực', 'Đảm bảo an toàn cơ bản'], price: 70000, priceText: '70k/h' },
        'tech': { title: 'Joy-Tech', tagline: 'Gia sư công nghệ', isVip: false, desc: 'Giúp người lớn tuổi làm chủ smartphone.', features: ['Hướng dẫn gọi Video Call', 'Dạy xem Youtube, đọc báo mạng', 'Cài đặt Wifi, chỉnh cỡ chữ', 'Nhận diện lừa đảo mạng'], price: 70000, priceText: '70k/h' },
        'event': { title: 'Joy-Event', tagline: 'Sự kiện/Họp lớp', isVip: false, desc: 'Đồng hành an toàn tham gia các buổi tiệc, gặp gỡ.', features: ['Chuẩn bị trang phục tươm tất', 'Tháp tùng, dìu đỡ phương tiện', 'Chụp ảnh, quay video kỷ niệm', 'Nhắc uống thuốc đúng cữ'], price: 90000, priceText: '90k/h' },
        'meal': { title: 'Joy-Meal', tagline: 'Bữa ăn dinh dưỡng', isVip: false, desc: 'Chuẩn bị và cùng thưởng thức bữa ăn ấm cúng.', features: ['Đi chợ tươi sạch', 'Nấu theo chế độ bệnh', 'Bầu bạn dùng bữa', 'Dọn dẹp khu bếp'], price: 90000, priceText: '90k/h' }
    },

    showServiceDetail: function (id) {
        const data = this.servicesData[id];
        if (!data) return;
        document.getElementById('modal-service-title').innerText = data.title;
        document.getElementById('modal-service-tagline').innerText = data.tagline;
        document.getElementById('modal-service-desc').innerText = data.desc;
        document.getElementById('modal-service-badge').style.display = data.isVip ? 'block' : 'none';
        document.getElementById('modal-service-features').innerHTML = data.features.map(f => `<li>${f}</li>`).join('');
        let priceEl = document.getElementById('modal-service-price');
        if (!priceEl) {
            priceEl = document.createElement('div');
            priceEl.id = 'modal-service-price';
            priceEl.style.cssText = 'font-weight:bold;color:var(--primary-orange);font-size:16px;margin-top:12px;';
            document.getElementById('modal-service-features').parentNode.appendChild(priceEl);
        }
        priceEl.innerText = '💰 Giá từ ' + (data.priceText || '');
        document.getElementById('service-modal').style.display = 'flex';
    },

    closeServiceDetail: function () { document.getElementById('service-modal').style.display = 'none'; },

    toggleVipPicker: function (serviceId) {
        const picker = document.getElementById('vip-joypal-selection');
        if (picker) picker.style.display = (serviceId === 'vip') ? 'block' : 'none';
        this.currentBooking.serviceId = serviceId;
    },

    _storedAddress: '10 Tôn Thất Tùng, Đống Đa, Hà Nội',

    goToConfirm: function () {
        const selectedRadio = document.querySelector('input[name="booking-service"]:checked');
        let serviceId = 'home';
        if (selectedRadio) {
            const label = selectedRadio.closest('label');
            const onchangeStr = selectedRadio.getAttribute('onchange');
            if (onchangeStr) {
                const match = onchangeStr.match(/'([^']+)'/);
                if (match) serviceId = match[1];
            }
        }

        const data = this.servicesData[serviceId];
        const durationSel = document.getElementById('booking-duration');
        const durationHours = durationSel ? parseInt(durationSel.value) : 1;

        let totalPrice = data.price;
        if (serviceId !== 'vip') {
            totalPrice = data.price * durationHours;
        }

        this.currentBooking = {
            serviceId: serviceId,
            price: totalPrice,
            hours: durationHours,
            title: data.title
        };

        const dateInput = document.getElementById('booking-date');
        let dateStr = '15/05/2026';
        if (dateInput && dateInput.value) { const p = dateInput.value.split('-'); if (p.length === 3) dateStr = `${p[2]}/${p[1]}/${p[0]}`; }
        const timeInput = document.getElementById('booking-time');
        const timeStr = (timeInput && timeInput.value) ? timeInput.value : '08:00';
        const durationText = durationSel ? durationSel.options[durationSel.selectedIndex].text : '1 giờ';

        // Capture the address
        const addrInput = document.getElementById('booking-address');
        if (addrInput && addrInput.value.trim()) this._storedAddress = addrInput.value.trim();

        document.getElementById('confirm-service').innerText = data.title;
        document.getElementById('confirm-time').innerText = `${timeStr}, ${dateStr}`;
        document.getElementById('confirm-duration').innerText = durationText;
        this.navigate('confirm');
    },

    startMatching: function () {
        this.navigate('finding');
        setTimeout(() => this.navigate('matched'), 2000);
    },

    confirmBooking: function () {
        // Populate payment screen with booking details
        const serviceName = this.currentBooking.title;
        const confirmTime = document.getElementById('confirm-time');
        const confirmDuration = document.getElementById('confirm-duration');
        const timeText = confirmTime ? confirmTime.innerText : '08:00, 15/05/2026';
        const durationText = confirmDuration ? confirmDuration.innerText : '1 giờ';

        const price = this.currentBooking.price.toLocaleString('vi-VN') + 'đ';

        const payName = document.getElementById('pay-service-name');
        const payTime = document.getElementById('pay-time');
        const payDur = document.getElementById('pay-duration');
        const payAmount = document.getElementById('pay-amount');
        const payTotal = document.getElementById('pay-total');
        const payAddr = document.getElementById('pay-address');
        if (payName) payName.innerText = serviceName;
        if (payTime) payTime.innerText = timeText;
        if (payDur) payDur.innerText = durationText;
        if (payAmount) payAmount.innerText = price;
        if (payTotal) payTotal.innerText = price;
        if (payAddr) payAddr.innerText = this._storedAddress || '10 Tôn Thất Tùng, Hà Nội';

        this.navigate('payment');
    },

    processPayment: function () {
        const btn = document.querySelector('#screen-payment button[onclick="app.processPayment()"]');
        const payMethod = document.querySelector('input[name="pay-method"]:checked')?.value;

        if (btn) { btn.innerText = 'Đang xử lý...'; btn.disabled = true; }

        setTimeout(() => {
            if (btn) { btn.innerText = 'Xác nhận thanh toán'; btn.disabled = false; }

            // Deduct balance if using JoyPay
            if (payMethod === 'joypay') {
                this.userBalance -= this.currentBooking.price;
                this.saveState();
                this.updateWalletUI();
            }

            // Unlock tracking screen
            this.bookingDone = true;

            // Generate random booking ID
            const bookingId = 'JC-2026-' + Math.floor(1000 + Math.random() * 9000);
            const idEl = document.getElementById('booking-id-display');
            if (idEl) idEl.innerText = bookingId;
            this.navigate('payment-success');
        }, 1500);
    },

    goToTracking: function () {
        this.navigate('tracking');
        this._resetTracking();
        this._simulateTracking();
        // Geocode address with Nominatim
        const address = this._storedAddress || '10 Tôn Thất Tùng, Hà Nội';
        const encoded = encodeURIComponent(address + ', Việt Nam');
        fetch(`https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`)
            .then(r => r.json())
            .then(data => {
                if (data && data.length > 0) {
                    const lat = parseFloat(data[0].lat);
                    const lon = parseFloat(data[0].lon);
                    const delta = 0.018;
                    const bbox = `${lon - delta},${lat - delta},${lon + delta},${lat + delta}`;
                    const iframe = document.getElementById('tracking-map-iframe');
                    if (iframe) iframe.src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lon}`;
                }
            })
            .catch(() => { });
    },

    _resetTracking: function () {
        const statusEl = document.getElementById('tracking-joypal-status');
        if (statusEl) statusEl.innerHTML = '<span style="width:6px;height:6px;background:#FF9800;border-radius:50%;display:inline-block;"></span> JoyPal Tuấn đang di chuyển đến...';
        const timeline = document.getElementById('chat-history');
        if (timeline) {
            timeline.innerHTML = `<div style="text-align:center;margin-bottom:15px;"><span style="background:rgba(255,255,255,0.1);font-size:11px;padding:5px 10px;border-radius:10px;color:#aaa;">Dịch vụ được xác nhận</span></div>
            <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:16px;">
                <div style="width:6px;height:6px;background:#FF9800;border-radius:50%;margin-top:6px;flex-shrink:0;"></div>
                <div style="flex:1;">
                    <div style="font-size:11px;color:#aaa;margin-bottom:4px;">Vừa xong</div>
                    <div style="background:rgba(255,255,255,0.08);border-radius:12px;padding:12px;">
                        <div style="font-size:13px;font-weight:700;color:white;margin-bottom:4px;"><i class="fa-solid fa-person-biking" style="color:#FF9800;margin-right:6px;"></i>JoyPal đang di chuyển</div>
                        <div style="font-size:12px;color:#aaa;">Chào chị! Em là Tuấn, JoyPal hôm nay. Em đang trên đường, khoảng 5 phút nữa tới ạ 🙏</div>
                    </div>
                </div>
            </div>`;
        }
        const chatInput = document.querySelector('.chat-input-area');
        if (chatInput) chatInput.style.display = 'flex';
        const ratingModal = document.getElementById('rating-modal');
        if (ratingModal) ratingModal.style.display = 'none';
        const marker = document.getElementById('joypal-marker');
        if (marker) { marker.style.top = '48%'; marker.style.left = '25%'; }
    },

    _simulateTracking: function () {
        const statusAlert = document.getElementById('tracking-status-alert');
        const timeline = document.getElementById('chat-history');
        const marker = document.getElementById('joypal-marker');
        const etaEl = document.getElementById('eta-text');
        setTimeout(() => {
            if (marker) { marker.style.top = '38%'; marker.style.left = '42%'; }
        }, 2000);
        setTimeout(() => {
            if (marker) { marker.style.top = '30%'; marker.style.left = '60%'; }
            const statusEl = document.getElementById('tracking-joypal-status');
            if (statusEl) statusEl.innerHTML = '<span style="width:6px;height:6px;background:#007AFF;border-radius:50%;display:inline-block;"></span> JoyPal Tuấn gần đến (1 phút)';
            if (timeline) { timeline.insertAdjacentHTML('beforeend', `<div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:16px;"><div style="width:6px;height:6px;background:#007AFF;border-radius:50%;margin-top:6px;flex-shrink:0;"></div><div style="flex:1;"><div style="font-size:11px;color:#aaa;margin-bottom:4px;">11:00 AM - Hiện tại</div><div style="background:rgba(255,255,255,0.08);border-radius:12px;padding:12px;"><div style="font-size:13px;font-weight:700;color:white;margin-bottom:4px;"><i class="fa-solid fa-location-dot" style="color:#007AFF;margin-right:6px;"></i>Gần đến</div><div style="font-size:12px;color:#aaa;">JoyPal Tuấn đang rẽ vào đường bạn.</div></div></div></div>`); timeline.scrollTop = timeline.scrollHeight; }
        }, 4000);
        setTimeout(() => {
            if (marker) { marker.style.top = '22%'; marker.style.left = '78%'; }
            const statusEl = document.getElementById('tracking-joypal-status');
            if (statusEl) statusEl.innerHTML = '<span style="width:6px;height:6px;background:#34C759;border-radius:50%;display:inline-block;"></span> JoyPal Tuấn đã đến nhà bạn! ✅';
            const timeNow = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            if (timeline) { timeline.insertAdjacentHTML('beforeend', `<div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:16px;"><div style="width:6px;height:6px;background:#34C759;border-radius:50%;margin-top:6px;flex-shrink:0;"></div><div style="flex:1;"><div style="font-size:11px;color:#aaa;margin-bottom:4px;">${timeNow}</div><div style="background:rgba(52,199,89,0.12);border:1px solid rgba(52,199,89,0.3);border-radius:12px;padding:12px;"><div style="font-size:13px;font-weight:700;color:#34C759;margin-bottom:4px;"><i class="fa-solid fa-shield-check" style="margin-right:6px;"></i>Check-in an toàn</div><div style="font-size:12px;color:#aaa;">Đã đến nhà khách, bố đang vui vẻ ra đón ạ.</div></div></div></div>`); timeline.scrollTop = timeline.scrollHeight; }
        }, 6000);
        setTimeout(() => {
            if (timeline) { timeline.insertAdjacentHTML('beforeend', `<div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:16px;"><img src="https://i.pravatar.cc/150?img=11" style="width:32px;height:32px;border-radius:50%;flex-shrink:0;"><div style="flex:1;"><div style="background:rgba(255,255,255,0.08);border-radius:12px;padding:12px;"><div style="font-size:13px;color:white;margin-bottom:8px;">Bác đang xem TV, em chuẩn bị trà 🍵</div><img src="https://images.unsplash.com/photo-1516307365426-bea591f05011?auto=format&fit=crop&q=80&w=300" style="width:160px;height:110px;border-radius:10px;object-fit:cover;"></div></div></div>`); timeline.scrollTop = timeline.scrollHeight; }
        }, 9000);
        setTimeout(() => {
            if (timeline) { timeline.insertAdjacentHTML('beforeend', `<div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:16px;"><img src="https://i.pravatar.cc/150?img=11" style="width:32px;height:32px;border-radius:50%;flex-shrink:0;"><div style="flex:1;"><div style="background:rgba(255,255,255,0.08);border-radius:12px;padding:12px;"><div style="font-size:13px;color:white;margin-bottom:8px;">Bác thắng 2 ván cờ tướng rồi 😊</div><img src="https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&q=80&w=300" style="width:160px;height:110px;border-radius:10px;object-fit:cover;"></div></div></div>`); timeline.scrollTop = timeline.scrollHeight; }
        }, 14000);
        setTimeout(() => this.finishTracking(), 18000);
    },

    sendChatMessage: function () {
        const input = document.getElementById('tracking-chat');
        if (!input || !input.value.trim()) return;
        const text = input.value.trim(); input.value = '';
        const timeline = document.getElementById('chat-history');
        const timeNow = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        if (timeline) { timeline.insertAdjacentHTML('beforeend', `<div style="display:flex;flex-direction:column;align-items:flex-end;margin-bottom:12px;width:100%;"><div style="background:#007AFF;color:white;padding:9px 14px;border-radius:18px;border-bottom-right-radius:4px;max-width:80%;font-size:13px;">${text}</div><span style="font-size:10px;color:#aaa;margin-top:3px;">${timeNow}</span></div>`); timeline.scrollTop = timeline.scrollHeight; }
    },

    finishTracking: function () {
        const chatInput = document.querySelector('.chat-input-area');
        if (chatInput) chatInput.style.display = 'none';
        const ratingModal = document.getElementById('rating-modal');
        if (ratingModal) ratingModal.style.display = 'flex';
    },

    setRating: function (stars) {
        document.querySelectorAll('#rating-stars i').forEach((star, idx) => { star.style.color = idx < stars ? '#ffd700' : '#444'; });
    },

    toggleTag: function (tagEl) { tagEl.classList.toggle('selected'); },

    toggleNotifications: function () {
        const panel = document.getElementById('notif-panel');
        const badge = document.getElementById('notif-badge');
        if (!panel) return;
        if (panel.style.display === 'none' || !panel.style.display) {
            panel.style.display = 'block';
            panel.style.animation = 'none';
            panel.style.opacity = '0';
            panel.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                panel.style.transition = 'opacity 0.22s ease, transform 0.22s ease';
                panel.style.opacity = '1';
                panel.style.transform = 'translateY(0)';
            }, 10);
            if (badge) badge.style.display = 'none'; // Hide badge when opened
        } else {
            panel.style.opacity = '0';
            panel.style.transform = 'translateY(-10px)';
            setTimeout(() => { panel.style.display = 'none'; }, 220);
        }
    },

    clearNotifications: function () {
        const list = document.getElementById('notif-list');
        if (list) {
            list.innerHTML = '<div style="text-align:center;padding:32px 20px;color:#888;font-size:13px;"><i class="fa-regular fa-bell-slash" style="font-size:32px;margin-bottom:12px;display:block;"></i>Không có thông báo mới</div>';
        }
        const badge = document.getElementById('notif-badge');
        if (badge) badge.style.display = 'none';
    },

    submitRating: function () {
        const ratingModal = document.getElementById('rating-modal');
        if (ratingModal) ratingModal.style.display = 'none';

        // Add 5 points after completion
        this.userPoints += 5;
        this.saveState();
        this.updateWalletUI();

        const timeNow = new Date().toLocaleDateString('vi-VN');
        const priceStr = this.currentBooking.price.toLocaleString('vi-VN') + 'đ';
        const historyHtml = `<div style="background:var(--bg-card);padding:15px;border-radius:12px;margin-bottom:10px;border:1px solid var(--border-color);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
                <b style="color:white;font-size:15px;"><i class="fa-solid fa-house text-success"></i> ${this.currentBooking.title}</b>
                <span style="color:var(--success-green);font-weight:bold;font-size:13px;">Hoàn thành</span>
            </div>
            <div style="font-size:13px;color:var(--text-secondary);margin-bottom:10px;">${timeNow} • JoyPal Tuấn</div>
            <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px dashed var(--border-color);padding-top:10px;">
                <b style="color:white;font-size:16px;">${priceStr}</b>
                <span style="color:#ffd700;font-size:13px;font-weight:bold;"><i class="fa-solid fa-star"></i> Đã đánh giá</span>
            </div></div>`;
        const profileHistory = document.getElementById('profile-history-list');
        if (profileHistory) profileHistory.innerHTML = historyHtml + profileHistory.innerHTML;
        const familyHistory = document.getElementById('family-history-list');
        if (familyHistory) {
            const placeholder = familyHistory.querySelector('div[style*="Chưa có lịch sử"]');
            if (placeholder) placeholder.remove();
            familyHistory.innerHTML = historyHtml + familyHistory.innerHTML;
        }
        // Add a completion notification to the home notification panel
        const notifList = document.getElementById('notif-list');
        if (notifList) {
            const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            const newNotif = document.createElement('div');
            newNotif.style.cssText = 'display:flex;gap:12px;padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.05);background:rgba(52,199,89,0.07);';
            newNotif.innerHTML = `
                <div style="width:42px;height:42px;background:linear-gradient(135deg,#34C759,#248A3D);border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <i class="fa-solid fa-circle-check" style="color:white;font-size:18px;"></i>
                </div>
                <div style="flex:1;">
                    <div style="font-size:13px;font-weight:700;color:white;margin-bottom:3px;">✅ Dịch vụ hoàn thành!</div>
                    <div style="font-size:11px;color:#aaa;line-height:1.4;">${this.currentBooking.title} với JoyPal Tuấn đã hoàn tất lúc ${timeStr}. Bạn đã nhận được +5 JoyPoints! 🎁</div>
                    <div style="font-size:10px;color:#34C759;margin-top:4px;font-weight:600;">⭐ Đánh giá đã được lưu</div>
                </div>`;
            notifList.insertBefore(newNotif, notifList.firstChild);
        }
        // Show badge
        const badge = document.getElementById('notif-badge');
        if (badge) { badge.style.display = 'flex'; badge.innerText = '1'; }

        setTimeout(() => this.navigate('thankyou'), 300);
    },

    toggleFullMap: function () {
        const mapContainer = document.getElementById('tracking-map-container');
        const timelineContainer = document.getElementById('tracking-timeline-container');
        const topBar = document.getElementById('tracking-top-bar');
        const expandBtn = document.getElementById('expand-map-btn');
        const screen = document.getElementById('screen-tracking');
        if (!mapContainer || !timelineContainer || !topBar || !screen) return;

        const isFull = mapContainer.classList.contains('full-map');

        if (!isFull) {
            mapContainer.classList.add('full-map');
            mapContainer.style.flex = '1 1 100%';
            mapContainer.style.height = '100%';
            mapContainer.style.maxHeight = '100%';
            timelineContainer.style.display = 'none';
            topBar.style.display = 'none';
            screen.style.height = '100%';
            if (expandBtn) {
                expandBtn.innerHTML = '<i class="fa-solid fa-compress" style="color:#555;"></i>';
                expandBtn.title = 'Thu nhỏ';
            }
        } else {
            mapContainer.classList.remove('full-map');
            mapContainer.style.flex = '0 0 42%';
            mapContainer.style.height = 'auto'; // Reset
            mapContainer.style.maxHeight = 'none';
            timelineContainer.style.display = 'flex';
            topBar.style.display = 'flex';
            screen.style.height = 'auto';
            if (expandBtn) {
                expandBtn.innerHTML = '<i class="fa-solid fa-expand" style="color:#555;"></i>';
                expandBtn.title = 'Phóng to';
            }
        }
    }
};

window.app = app;
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('joycare_theme') === 'light') {
        document.documentElement.classList.add('light-theme');
        const icon = document.getElementById('theme-icon');
        if (icon) { icon.className = 'fa-solid fa-sun'; icon.style.color = '#FFD700'; }
    }
    app.updateWalletUI();
    app.navigate('login');
});
