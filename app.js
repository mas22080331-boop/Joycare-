const app = {
    navigate: function(screenId) {
        const screens = document.querySelectorAll('.screen');
        screens.forEach((s) => {
            s.classList.remove('active');
            s.style.display = 'none'; // reset all
        });
        
        const target = document.getElementById('screen-' + screenId);
        if(target) {
            target.classList.add('active');
            target.style.display = (screenId === 'finding') ? 'flex' : 'block';
        }

        // Update bottom nav
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        const navTarget = document.querySelector(`.nav-item[data-target="${screenId}"]`);
        if(navTarget) navTarget.classList.add('active');

        // Hide bottom nav on specific screens
        const noNavScreens = ['login', 'vneid', 'finding', 'matched'];
        const bottomNav = document.querySelector('.bottom-nav');
        if (bottomNav) {
            bottomNav.style.display = noNavScreens.includes(screenId) ? 'none' : 'flex';
        }
    },

    showVNeID: function() {
        this.navigate('vneid');
        
        // Reset UI for NFC Scanning
        const statusEl = document.getElementById('nfc-scan-status');
        if(statusEl) statusEl.innerText = 'Đang tìm kiếm thẻ...';
        
        const scanLine = document.querySelector('.scan-line');
        if(scanLine) scanLine.style.display = 'block';
        
        const finishBtn = document.getElementById('btn-vneid-finish');
        if(finishBtn) finishBtn.style.display = 'none';
        
        // Mock scan delay
        setTimeout(() => {
            if(statusEl) {
                statusEl.innerText = 'Đọc thông tin trên Chip thành công ✓';
                statusEl.style.color = 'var(--success-green)';
            }
            if(scanLine) scanLine.style.display = 'none';
            if(finishBtn) finishBtn.style.display = 'block';
            
            setTimeout(() => {
                app.navigate('home');
            }, 1500);
        }, 3000);
    },

    servicesData: {
        'hospital': { title: 'Joy-Hospital (Basic)', tagline: 'Tháp tùng đi viện cơ bản', isVip: false, desc: 'Hỗ trợ người cao tuổi di chuyển, lấy số và xếp hàng tại bệnh viện.', features: ['Đặt xe và dìu đỡ tận nơi', 'Hỗ trợ lấy số thứ tự, sổ khám bệnh', 'Xếp hàng chờ lấy thuốc thay người già', 'Nhắc nhở lịch trình cơ bản'] },
        'vip': { title: 'Hospital (VIP)', tagline: 'Trọn gói & Live Tracking', isVip: true, desc: 'Dịch vụ cao cấp, hỗ trợ toàn diện các thủ tục phức tạp và báo cáo trực tiếp (Live) cho con cái.', features: ['Ưu tiên chọn JoyPal điểm EQ > 90', 'Cập nhật hình ảnh/video liên tục vào bảng Live Tracking', 'Ghi chép chi tiết lời dặn của bác sĩ/toa thuốc', 'Hỗ trợ thanh toán viện phí an toàn'] },
        'home': { title: 'Joy-Home', tagline: 'Trò chuyện tại nhà', isVip: false, desc: 'Giải tỏa cô đơn bằng những giờ phút bầu bạn, chia sẻ ấm cúng ngay tại nhà.', features: ['Lắng nghe và trò chuyện tâm giao', 'Cùng đọc báo, xem TV, nghe nhạc xưa', 'Đi dạo nhẹ nhàng quanh khu vực sống', 'Đảm bảo an toàn cơ bản trong nhà'] },
        'tech': { title: 'Joy-Tech', tagline: 'Gia sư công nghệ', isVip: false, desc: 'Giúp người lớn tuổi tự tin làm chủ smartphone và kết nối với con cháu.', features: ['Hướng dẫn gọi Video Call (Zalo, Messenger)', 'Dạy cách xem Youtube, đọc báo mạng', 'Cài đặt mạng Wifi, chỉnh cỡ chữ điện thoại', 'Hướng dẫn nhận diện để tránh lừa đảo trên mạng'] },
        'event': { title: 'Joy-Event', tagline: 'Sự kiện/Họp lớp', isVip: false, desc: 'Đồng hành an toàn cùng người cao tuổi tham gia các buổi tiệc, gặp mặt họ hàng.', features: ['Hỗ trợ chuẩn bị trang phục tươm tất', 'Tháp tùng, dìu đỡ lên xuống các phương tiện', 'Chụp ảnh, quay video kỷ niệm giúp người già', 'Nhắc nhở ăn uống đúng giờ, uống thuốc đúng cữ'] },
        'meal': { title: 'Joy-Meal', tagline: 'Bữa ăn dinh dưỡng', isVip: false, desc: 'Chuẩn bị và cùng thưởng thức những bữa ăn ấm cúng, hợp khẩu vị.', features: ['Đi chợ mua thực phẩm tươi sạch quanh nhà', 'Sơ chế và nấu ăn theo chế độ (tiểu đường, huyết áp...)', 'Bầu bạn dùng bữa chung tạo không khí gia đình', 'Dọn dẹp cơ bản khu vực bếp sau khi ăn'] }
    },

    showServiceDetail: function(id) {
        const data = this.servicesData[id];
        if(!data) return;
        document.getElementById('modal-service-title').innerText = data.title;
        document.getElementById('modal-service-tagline').innerText = data.tagline;
        document.getElementById('modal-service-desc').innerText = data.desc;
        const badge = document.getElementById('modal-service-badge');
        if(data.isVip) { badge.style.display = 'block'; } else { badge.style.display = 'none'; }
        
        const list = document.getElementById('modal-service-features');
        list.innerHTML = data.features.map(f => `<li>${f}</li>`).join('');
        
        document.getElementById('service-modal').classList.add('active');
        document.getElementById('service-modal').style.display = 'flex';
    },

    closeServiceDetail: function() {
        document.getElementById('service-modal').classList.remove('active');
        document.getElementById('service-modal').style.display = 'none';
    },

    toggleVipPicker: function(serviceId) {
        const picker = document.getElementById('vip-joypal-selection');
        if(picker) {
            picker.style.display = (serviceId === 'vip') ? 'block' : 'none';
        }
    },

    startMatching: function() {
        // Check if VIP JoyPal selected manually
        const vipPicker = document.getElementById('vip-joypal-selection');
        if(vipPicker && vipPicker.style.display !== 'none') {
            const manualSelected = document.querySelector('input[name="vip-joypal-choice"]:checked');
            if(manualSelected && manualSelected.value !== 'auto') {
                this.navigate('matched');
                return;
            }
        }

        this.navigate('finding');
        
        setTimeout(() => {
            this.navigate('matched');
        }, 2000);
    },

    simulateVNPAY: function() {
        alert('Chuyển hướng đến cổng thanh toán VNPAY...\nGiả lập xác nhận tạm giữ 170.000đ thành công!');
        this.navigate('tracking'); 
        
        // Reset Tracking UI
        const statusAlert = document.getElementById('tracking-status-alert');
        if(statusAlert) {
            statusAlert.innerHTML = '<i class="fa-solid fa-person-biking"></i> JoyPal đang di chuyển đến nhà bạn (5 phút...)';
            statusAlert.style.background = 'rgba(255, 152, 0, 0.1)';
            statusAlert.style.borderColor = 'var(--primary-orange)';
            statusAlert.style.color = 'var(--primary-orange)';
        }
        
        const timeline = document.getElementById('chat-history');
        if(timeline) {
            // Keep only the first "Dịch vụ được xác nhận" message if we want a clean state
            timeline.innerHTML = '<div style="text-align: center; margin-bottom: 20px;"><span style="background: var(--bg-card); font-size: 11px; padding: 5px 10px; border-radius: 10px; color: var(--text-secondary);">Dịch vụ được xác nhận</span></div>';
        }

        // T+3s: Simulate JoyPal arriving
        setTimeout(() => {
            if(statusAlert) {
                statusAlert.innerHTML = '<i class="fa-solid fa-bell"></i> JoyPal đã đến khách hàng!';
                statusAlert.style.background = 'rgba(52, 199, 89, 0.1)';
                statusAlert.style.borderColor = 'var(--success-green)';
                statusAlert.style.color = 'var(--success-green)';
            }
            
            // Auto send system message to chat
            if(timeline) {
                const timeNow = new Date().toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'});
                const msgHtml = `<div style="text-align: center; margin-bottom: 20px;"><span style="background: var(--bg-card); font-size: 11px; padding: 5px 10px; border-radius: 10px; color: var(--success-green); border: 1px solid var(--success-green);"><i class="fa-solid fa-location-dot"></i> JoyPal đã đến vào lúc ${timeNow}</span></div>`;
                timeline.insertAdjacentHTML('beforeend', msgHtml);
                const sheet = document.querySelector('#chat-history');
                if(sheet) sheet.scrollTop = sheet.scrollHeight;
            }
            
            // T+8s (from start): Simulate service finish and show Rating screen
            setTimeout(() => {
                app.finishTracking();
            }, 5000); // 5s after arrive (total 8s for demo)
            
        }, 3000);
    },

    sendChatMessage: function() {
        const input = document.getElementById('tracking-chat');
        if(!input || !input.value.trim()) return;
        
        const text = input.value.trim();
        input.value = '';
        
        const timeline = document.getElementById('chat-history');
        
        const timeNow = new Date().toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'});
        const msgHtml = `
            <div style="display: flex; flex-direction: column; align-items: flex-end; margin-bottom: 15px; width: 100%;">
                <div style="background-color: var(--primary-blue); color: white; padding: 10px 15px; border-radius: 20px; border-bottom-right-radius: 4px; max-width: 80%; font-size: 15px;">
                    ${text}
                </div>
                <span style="font-size: 11px; color: var(--text-secondary); margin-top: 5px;">${timeNow}</span>
            </div>
        `;
        timeline.insertAdjacentHTML('beforeend', msgHtml);
        
        const sheet = document.querySelector('#chat-history');
        if (sheet) sheet.scrollTop = sheet.scrollHeight;
    },

    finishTracking: function() {
        document.getElementById('rating-modal').style.display = 'flex';
        document.querySelector('.chat-input-area').style.display = 'none';
    },

    toggleTag: function(tagEl) {
        tagEl.classList.toggle('selected');
    },

    submitRating: function() {
        document.getElementById('rating-modal').style.display = 'none';
        
        const historyList = document.getElementById('profile-history-list');
        if(historyList) {
            const timeNow = new Date().toLocaleDateString('vi-VN');
            const historyHtml = `
            <div style="background: var(--bg-card); padding: 15px; border-radius: 12px; margin-bottom: 10px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px;">
                    <b style="color: white; font-size: 15px;"><i class="fa-solid fa-house text-success"></i> Joy-Home</b>
                    <span style="color: var(--success-green); font-weight: bold; font-size: 13px;">Hoàn thành</span>
                </div>
                <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 15px;">${timeNow} • JoyPal Tuấn</div>
                <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed var(--border-color); padding-top: 10px;">
                    <b style="color: white; font-size: 16px;">170.000đ</b>
                    <span style="color: var(--primary-orange); font-size: 13px; font-weight: bold;"><i class="fa-solid fa-star"></i> Đã đánh giá</span>
                </div>
            </div>`;
            historyList.innerHTML = historyHtml + historyList.innerHTML;
        }

        setTimeout(() => {
            this.navigate('profile');
        }, 300);
    },

    openSupportCenter: function() {
        alert("Kết nối đến Trung tâm Hỗ trợ JoyCare qua Zalo/Hotline...\n(Tính năng nhắn tin CSKH đang được phát triển)");
    }
};

window.app = app;

document.addEventListener('DOMContentLoaded', () => {
    // Phase 5 Fix: Ensure app initiates on login screen and hides nav bar correctly
    app.navigate('login');
});
