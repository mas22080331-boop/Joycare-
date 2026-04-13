import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    signInWithPopup,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
    doc,
    getDoc,
    setDoc,
    collection,
    addDoc,
    getDocs,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { auth, db, googleProvider, RecaptchaVerifier, signInWithPhoneNumber } from "./firebase-config.js";
// Groq API Configuration
const GROQ_API_KEY = "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";
const SYSTEM_INSTRUCTION = "Con là JoyAI, trợ lý ảo thông minh và lễ phép của JoyCare. Con luôn xưng hô là 'con' và gọi người dùng là 'Cô/Chú/Anh/Chị' (hoặc 'mình' một cách thân thiện). JoyCare cung cấp dịch vụ chăm sóc người già bởi sinh viên ngành Y (JoyPal). \n\nThông tin dịch vụ:\n- Joy-Hospital: 110.000đ/giờ (tháp tùng đi viện).\n- Hospital VIP: 450.000đ/ca (có Live Tracking, báo cáo chi tiết).\n- Joy-Home: 100.000đ/giờ (tâm sự, đi dạo tại nhà, khách mới giảm 20%).\n- Joy-Tech / Joy-Meal / Joy-Event: 70k - 90k/giờ.\n- Gói định kỳ: Hiếu Nghĩa (1.5tr/tháng - 3 buổi/tuần), Toàn Diện (3.5tr/tháng - 7 buổi/tuần).\n\nQuy tắc trả lời:\n1. Luôn lễ phép, tử tế, dùng từ ngữ ấm áp.\n2. Nếu hỏi về y khoa/bệnh tật: Con luôn dặn đây chỉ là tham khảo, hãy đi khám bác sĩ hoặc gọi 115 nếu khẩn cấp. Con tuyệt đối không kê đơn thuốc.\n3. Nếu hỏi về giá/dịch vụ: Con trả lời chính xác dựa trên dữ liệu trên.\n4. Nếu khách than buồn/cô đơn: Con an ủi và gợi ý đặt Joy-Home để có người bầu bạn.";


const app = {
    // App State with Firebase and Persistence
    currentUser: null,
    currentScreen: 'role-selection', // Track active screen
    previousScreen: null,
    userBalance: 1250000,
    userPoints: 2450,
    bookingDone: false,
    familyProfileComplete: false,
    userRole: 'customer', // 'customer' or 'joypal'
    joypalState: {
        isOnline: false,
        earnings: 1250000,
        completedJobs: 14,
        withdrawable: 850000,
        earningsHistory: [
            { day: 'T2', amount: 120000 },
            { day: 'T3', amount: 350000 },
            { day: 'T4', amount: 180000 },
            { day: 'T5', amount: 450000 },
            { day: 'T6', amount: 220000 },
            { day: 'T7', amount: 560000 },
            { day: 'CN', amount: 380000 }
        ],
        withdrawMethod: 'MoMo',
        gems: 450,
        activeJob: null,
        heatmapActive: false,
        heatmapCircles: [],
        priorityCircles: [],
        chatMessages: [],
        activeJobMarkers: {}, // Tracks map markers for available jobs
        withdrawalHistory: [
            { id: 'TXN-1002', date: '2026-04-08 09:12', amount: 300000, method: 'MoMo', status: 'success' },
            { id: 'TXN-0995', date: '2026-04-05 14:45', amount: 500000, method: 'Ngân hàng', status: 'success' },
            { id: 'TXN-0982', date: '2026-04-01 10:20', amount: 200000, method: 'MoMo', status: 'success' }
        ],
        notifications: [
            { id: 1, type: 'reward', title: 'Ưu đãi độc quyền cho JoyPal VIP!', text: 'Hoàn thành 50 giờ chăm sóc trong tháng này để nhận bảo hiểm JoyCare Care Pro miễn phí.', time: '10 phút trước', unread: true },
            { id: 2, type: 'info', title: 'Cập nhật quy trình xác thực', text: 'Kể từ hôm nay, VNeID cấp độ 2 là bắt buộc để duy trì hoạt động trên JoyCare.', time: '2 giờ trước', unread: false },
            { id: 3, type: 'finance', title: 'Thu nhập tuần này đã có', text: 'Chúc mừng! Bạn đã đạt 1.250k trong tuần qua. Tiền đã được chuyển vào ví tín dụng.', time: 'Hôm qua', unread: false }
        ],
        vetting: { layer1: true, layer2: true, layer3: true, layer4: true } // Simulation: fully vetted
    },
    joypalMap: null,
    mapMode: 'static', // 'static' or 'live'
    isBottomSheetOpen: false,

    // NEW: JoyPal Data for Detail Modal
    joyPals: [
        {
            id: 'jp-my',
            name: 'Nguyễn Trần My',
            age: 22,
            avatar: 'https://i.pravatar.cc/150?img=5',
            rating: 4.9,
            reviews_count: 120,
            hours: '350+',
            verified_vneid: true,
            verified_student: true,
            university: 'Đại học Y Hà Nội',
            major: 'Điều dưỡng đa khoa',
            year: 'Sinh viên Năm 4',
            bio: 'Chào cô chú và các anh chị! Cháu là My, một người hướng ngoại, vui vẻ và đặc biệt thích trò chuyện cùng người lớn tuổi. Cháu có kinh nghiệm chăm sóc ông bà tại nhà và đã đi lâm sàng tại viện Tim Hà Nội. Cháu hy vọng sẽ mang lại niềm vui và sức khỏe cho ông bà mỗi ngày!',
            skills: {
                medical: ['Đo huyết áp/Đường huyết', 'Sơ cứu cơ bản', 'Vật lý trị liệu nhẹ'],
                care: ['Hỗ trợ đi lại/Xe lăn', 'Nhắc lịch uống thuốc'],
                personality: ['Vui vẻ', 'Lắng nghe', 'Cẩn thận']
            },
            top_reviews: [
                { author: 'Chị Lan, Hoàn Kiếm', content: 'Bạn My rất ngoan, đến đúng giờ. Mẹ mình rất thích nói chuyện với bạn ấy.' },
                { author: 'Anh Tú, Cầu Giấy', content: 'Kỹ năng đo huyết áp và xoa bóp tay chân rất tốt, nhẹ nhàng.' }
            ]
        },
        {
            id: 'jp-tuan',
            name: 'Lê Anh Tuấn',
            age: 21,
            avatar: 'https://i.pravatar.cc/150?img=11',
            rating: 4.9,
            reviews_count: 145,
            hours: '420+',
            verified_vneid: true,
            verified_student: true,
            university: 'Đại học Y Hà Nội',
            major: 'Y khoa',
            year: 'Sinh viên Năm 3',
            bio: 'Cháu là Tuấn, hiện là sinh viên Y khoa. Cháu rất kiên nhẫn và có kinh nghiệm hỗ trợ phục hồi chức năng cho người cao tuổi sau tai biến. Cháu tin rằng sự quan tâm đúng cách sẽ giúp ông bà nhanh chóng phục hồi hơn.',
            skills: {
                medical: ['Vật lý trị liệu', 'Theo dõi dấu hiệu sinh tồn'],
                care: ['Hỗ trợ vận động', 'Tắm rửa/Vệ sinh'],
                personality: ['Kiên nhẫn', 'Điềm đạm']
            },
            top_reviews: [
                { author: 'Chú Hùng, Thanh Xuân', content: 'Tuấn giúp bác tập đi rất tốt. Rất chuyên nghiệp.' }
            ]
        },
        {
            id: 'jp-hung',
            name: 'Phạm Mạnh Hùng',
            age: 23,
            avatar: 'https://i.pravatar.cc/150?img=15',
            rating: 4.7,
            reviews_count: 88,
            hours: '280+',
            verified_vneid: true,
            verified_student: true,
            university: 'Đại học Y Hà Nội',
            major: 'Y khoa',
            year: 'Sinh viên Năm 5',
            bio: 'Chào mọi người, cháu là Hùng. Với kiến thức Y khoa vững vàng của sinh viên năm 5, cháu tự tin hỗ trợ Cô/Chú trong việc quản lý sức khỏe định kỳ và thực hiện các kỹ thuật Y tế cơ bản tại nhà.',
            skills: {
                medical: ['Tiêm/Truyền (dưới sự chỉ định)', 'Thay băng rạng dọc'],
                care: ['Giám sát dùng thuốc'],
                personality: ['Nghiêm túc', 'Cẩn trọng']
            },
            top_reviews: [
                { author: 'Chị Mai, Hai Bà Trưng', content: 'Hùng rất cẩn thận và có chuyên môn cao.' }
            ]
        },
        {
            id: 'jp-lan',
            name: 'Hoàng Mai Lan',
            age: 21,
            avatar: 'https://i.pravatar.cc/150?img=47',
            rating: 4.8,
            reviews_count: 112,
            hours: '310+',
            verified_vneid: true,
            verified_student: true,
            university: 'Đại học Y Hà Nội',
            major: 'Y đa khoa',
            year: 'Sinh viên Năm 3',
            bio: 'Em là Lan, sinh viên Y3. Em rất yêu thích việc chăm sóc người cao tuổi và có thế mạnh về việc hỗ trợ dinh dưỡng cũng như nhắc nhở uống thuốc đúng giờ.',
            skills: {
                medical: ['Theo dõi huyết áp', 'Quản lý thuốc'],
                care: ['Vệ sinh cá nhân', 'Trò chuyện'],
                personality: ['Nhẹ nhàng', 'Chu đáo']
            },
            top_reviews: [
                { author: 'Bác Mai, Ba Đình', content: 'Cháu Lan rất lễ phép và cẩn thận.' }
            ]
        },
        {
            id: 'jp-duc',
            name: 'Trần Minh Đức',
            age: 22,
            avatar: 'https://i.pravatar.cc/150?img=12',
            rating: 4.9,
            reviews_count: 95,
            hours: '280+',
            verified_vneid: true,
            verified_student: true,
            university: 'Đại học Y Hà Nội',
            major: 'Kỹ thuật Phục hồi chức năng',
            year: 'Sinh viên Năm 4',
            bio: 'Đức chuyên về phục hồi chức năng và vật lý trị liệu. Mình có thể hỗ trợ các cụ tập luyện sau chấn thương hoặc tai biến tại nhà.',
            skills: {
                medical: ['Vật lý trị liệu', 'Phục hồi chức năng'],
                care: ['Hỗ trợ đi lại', 'Tập vận động'],
                personality: ['Nhiệt tình', 'Kiên trì']
            },
            top_reviews: [
                { author: 'Anh Hoàng, Long Biên', content: 'Đức giúp bố mình tập đi rất tiến bộ.' }
            ]
        },
        {
            id: 'jp-vy',
            name: 'Lê Thảo Vy',
            age: 20,
            avatar: 'https://i.pravatar.cc/150?img=26',
            rating: 4.8,
            reviews_count: 76,
            hours: '210+',
            verified_vneid: true,
            verified_student: true,
            university: 'Đại học Y Hà Nội',
            major: 'Điều dưỡng',
            year: 'Sinh viên Năm 2',
            bio: 'Vy là sinh viên điều dưỡng năm 2, rất năng động và thích nấu ăn các món thanh đạm cho người già. Vy luôn mong muốn mang lại tiếng cười cho các ông bà.',
            skills: {
                medical: ['Sơ cứu cơ bản'],
                care: ['Nấu ăn dinh dưỡng', 'Lắng nghe'],
                personality: ['Vui vẻ', 'Năng nổ']
            },
            top_reviews: [
                { author: 'Cô Liên, Tây Hồ', content: 'Vy nấu cháo rất ngon, bà rất thích.' }
            ]
        },
        {
            id: 'jp-quang',
            name: 'Phạm Đăng Quang',
            age: 24,
            avatar: 'https://i.pravatar.cc/150?img=52',
            rating: 5.0,
            reviews_count: 210,
            hours: '550+',
            verified_vneid: true,
            verified_student: true,
            university: 'Đã tốt nghiệp ĐH Y Hà Nội',
            major: 'Bác sĩ đa khoa (Đang học Nội trú)',
            year: 'Bác sĩ trẻ',
            bio: 'Quang đã tốt nghiệp và hiện đang học bác sĩ nội trú. Với kiến thức chuyên môn sâu, Quang có thể hỗ trợ các gia đình cần sự chăm sóc y tế chuyên sâu hơn tại nhà.',
            skills: {
                medical: ['Thăm khám lâm sàng', 'Tiêm truyền'],
                care: ['Giám sát y tế'],
                personality: ['Chuyên nghiệp', 'Điềm tĩnh']
            },
            top_reviews: [
                { author: 'Gia đình bác Việt', content: 'Rất may mắn có Quang hỗ trợ lúc bác ốm nặng.' }
            ]
        },
        {
            id: 'jp-linh',
            name: 'Nguyễn Diệu Linh',
            age: 21,
            avatar: 'https://i.pravatar.cc/150?img=32',
            rating: 4.9,
            reviews_count: 156,
            hours: '380+',
            verified_vneid: true,
            verified_student: true,
            university: 'Đại học Y Hà Nội',
            major: 'Y học cổ truyền',
            year: 'Sinh viên Năm 4',
            bio: 'Linh học về y học cổ truyền, có khả năng xoa bóp, bấm huyệt và châm cứu (dưới sự chỉ định). Linh rất thấu hiểu tâm lý người lớn tuổi.',
            skills: {
                medical: ['Xoa bóp bấm huyệt', 'Dấu hiệu sinh tồn'],
                care: ['Tâm lý người già'],
                personality: ['Kiên nhẫn', 'Thấu cảm']
            },
            top_reviews: [
                { author: 'Chú Bình, Hà Đông', content: 'Linh bấm huyệt rất dễ chịu, giảm đau lưng hẳn.' }
            ]
        }
    ],

    // NEW: Community Mock Data
    communityPosts: [
        {
            id: 'post-1',
            authorId: 'jp-my',
            authorName: 'JoyPal My',
            authorAvatar: 'https://i.pravatar.cc/150?img=5',
            authorRole: 'joypal',
            time: '15 phút trước',
            content: 'Cuối tuần được bác Tú dẫn đi dạo công viên Thống Nhất. Không khí trong lành, bác kể chuyện tiếu lâm làm cháu cười đau cả bụng. ❤️',
            image: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=600&q=80',
            likes: 42,
            comments: 5,
            isLiked: false,
            tag: 'Bầu bạn'
        },
        {
            id: 'post-2',
            authorId: 'jp-tuan',
            authorName: 'JoyPal Tuấn',
            authorAvatar: 'https://i.pravatar.cc/150?img=11',
            authorRole: 'joypal',
            time: '2 giờ trước',
            content: 'Hôm nay bác Hùng đã có thể tự đi lại 10 bước mà không cần gậy. Một nỗ lực tuyệt vời của bác sau 2 tháng phục hồi chức năng! Giỏi lắm bác ơi! 👏🩺',
            image: 'https://images.unsplash.com/photo-1576091160550-217359f488d5?auto=format&fit=crop&w=600&q=80',
            likes: 128,
            comments: 12,
            isLiked: true,
            tag: 'Phục hồi'
        },
        {
            id: 'post-3',
            authorId: 'user-lan',
            authorName: 'Chị Lan',
            authorAvatar: 'https://i.pravatar.cc/150?img=47',
            authorRole: 'elder',
            time: '5 giờ trước',
            content: 'Cảm ơn JoyCare đã kết nối mình với bạn Hùng. Bố mình rất khó tính trong việc uống thuốc nhưng Hùng rất kiên nhẫn thuyết phục. Thật sự yên tâm khi đi làm.',
            image: null,
            likes: 15,
            comments: 2,
            isLiked: false,
            tag: 'Cảm ơn'
        },
        {
            id: 'post-4',
            authorId: 'user-mai',
            authorName: 'Bác Mai',
            authorAvatar: 'https://i.pravatar.cc/150?img=26',
            authorRole: 'elder',
            time: '8 giờ trước',
            content: 'Vừa hoàn thành bức tranh màu nước đầu tiên trong lớp vẽ JoyCare. Cảm thấy tâm hồn trẻ lại bao nhiêu! 🎨🌸',
            image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=600&q=80',
            likes: 89,
            comments: 7,
            isLiked: false,
            tag: 'Giải trí'
        }
    ],

    communityStories: [
        { id: 's1', name: 'Cháu My', avatar: 'https://i.pravatar.cc/150?img=5', image: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=200&q=80', seen: false },
        { id: 's2', name: 'Bác An', avatar: 'https://i.pravatar.cc/150?img=34', image: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?auto=format&fit=crop&w=200&q=80', seen: false },
        { id: 's3', name: 'Tuấn JoyPal', avatar: 'https://i.pravatar.cc/150?img=11', image: 'https://images.unsplash.com/photo-1576091160550-217359f488d5?auto=format&fit=crop&w=200&q=80', seen: true },
        { id: 's4', name: 'Cô Lan', avatar: 'https://i.pravatar.cc/150?img=47', image: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?auto=format&fit=crop&w=200&q=80', seen: true }
    ],

    communityEvents: [
        { id: 'e1', title: 'Hội thảo Dinh dưỡng Người cao tuổi', time: '09:00, CN tuần này', location: 'Công viên Thống Nhất', img: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=500&q=80' },
        { id: 'e2', title: 'Lớp Yoga thiền buổi sáng', time: '06:30, Thứ 3 hàng tuần', location: 'Trực tuyến Google Meet', img: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=500&q=80' }
    ],

    communityTips: [
        { title: 'Mẹo sống vui', content: 'Dành 15 phút mỗi sáng để hít thở sâu giúp tâm trí minh mẫn hơn.', icon: 'fa-sun', color: 'orange' },
        { title: 'Dinh dưỡng', content: 'Người cao tuổi nên chia nhỏ bữa ăn và bổ sung thêm rau xanh đậm.', icon: 'fa-leaf', color: 'green' }
    ],

    topJoyPals: [
        { name: 'Tuấn', rating: 4.9, avatar: 'https://i.pravatar.cc/150?img=11', specialty: 'Phục hồi chức năng' },
        { name: 'My', rating: 5.0, avatar: 'https://i.pravatar.cc/150?img=5', specialty: 'Tâm lý & Bầu bạn' },
        { name: 'Hùng', rating: 4.8, avatar: 'https://i.pravatar.cc/150?img=12', specialty: 'Điều dưỡng Y khoa' }
    ],

    communityLeaderboard: [
        { name: 'Bác Hùng', points: 1250, avatar: 'https://i.pravatar.cc/150?img=11', rank: 1 },
        { name: 'Bác An', points: 1100, avatar: 'https://i.pravatar.cc/150?img=34', rank: 2 },
        { name: 'Bác Tú', points: 950, avatar: 'https://i.pravatar.cc/150?img=12', rank: 3 }
    ],

    clubs: {
        'chess': {
            name: 'CLB Cờ Tướng',
            memberCount: 128,
            bg: 'https://images.unsplash.com/photo-1529158062015-cb6369dc13a6?auto=format&fit=crop&w=500&q=80',
            activities: [
                { title: 'Giải đấu giao lưu tháng 3', img: 'https://images.unsplash.com/photo-1586165368502-1bad197a64e1?auto=format&fit=crop&w=300&q=80' },
                { title: 'Bác Hùng vs Cháu Tuấn', img: 'https://images.unsplash.com/photo-1610633389283-c07a34651343?auto=format&fit=crop&w=300&q=80' }
            ]
        },
        'poetry': {
            name: 'CLB Thơ Ca',
            memberCount: 86,
            bg: 'https://images.unsplash.com/photo-1455391727117-6a415ed72d4b?auto=format&fit=crop&w=500&q=80',
            activities: [
                { title: 'Buổi ngâm thơ chiều chủ nhật', img: 'https://images.unsplash.com/photo-1476610182048-b716b8518aae?auto=format&fit=crop&w=300&q=80' },
                { title: 'Sáng tác mới của Bác Mai', img: 'https://images.unsplash.com/photo-1544640808-32ca72ac7f67?auto=format&fit=crop&w=300&q=80' }
            ]
        },
        'garden': {
            name: 'CLB Yoga',
            memberCount: 156,
            bg: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=500&q=80',
            activities: [
                { title: 'Thiền định buổi sáng', img: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=300&q=80' },
                { title: 'Lớp Yoga cơ bản cho người lớn tuổi', img: 'https://images.unsplash.com/photo-1552196564-972b20126ca4?auto=format&fit=crop&w=300&q=80' }
            ]
        }
    },

    // Centralized Groq calling method
    _callGroq: async function (prompt) {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: SYSTEM_INSTRUCTION },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 1024
            })
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `Lỗi API (${response.status})`);
        }
        const data = await response.json();
        return data.choices[0].message.content;
    },


    selectRole: function (role) {
        if (role === 'customer') {
            this.navigate('login');
        } else if (role === 'joypal') {
            this.navigate('joypal-login');
        }
    },

    initAuth: function () {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                this.currentUser = user;
                console.log("User status check:", user.email || user.phoneNumber);

                // Ensure user document exists in Firestore (for Google/Phone users)
                try {
                    const userRef = doc(db, "users", user.uid);
                    const userDoc = await getDoc(userRef);
                    if (!userDoc.exists()) {
                        await setDoc(userRef, {
                            email: user.email || "",
                            phone: user.phoneNumber || "",
                            displayName: user.displayName || "Thành viên JoyCare",
                            balance: 1250000,
                            points: 2450,
                            createdAt: serverTimestamp()
                        });
                    }
                    await this.loadUserData();
                } catch (e) {
                    console.error("Firestore initialization error:", e);
                    // Continue even if database fails (allows guest-like home visit if rules are strict)
                }

                this.initCommunitySync();

                // If user is already authenticated, always route to customer home
                // (unless they are currently in a mid-flow screen)
                if (['login', 'register', 'role-selection'].includes(this.currentScreen)) {
                    this.userRole = 'customer';
                    document.body.classList.remove('joypal-mode');
                    this.navigate('home');
                } else if (this.currentScreen === 'joypal-login') {
                    this.userRole = 'joypal';
                    document.body.classList.add('joypal-mode');
                    this.navigate('joypal-home');
                }
            } else {
                this.currentUser = null;
                console.log("No User Session");
                if (!['login', 'joypal-login', 'register', 'role-selection'].includes(this.currentScreen)) {
                    this.navigate('role-selection');
                }
            }
        });
    },

    login: async function () {
        // Tự động đăng nhập mà không cần kiểm tra thông tin
        this.showNotification("Chào mừng Khách hàng trở lại!", "success");
        this.userRole = 'customer';
        document.body.classList.remove('joypal-mode');
        this.navigate('home');
    },

    loginJoyPal: async function () {
        // Tự động đăng nhập mà không cần kiểm tra thông tin
        this.showNotification("Đăng nhập JoyPal thành công!", "success");
        this.userRole = 'joypal';
        document.body.classList.add('joypal-mode');
        this.navigate('joypal-home');

        // Show a welcome notice after a short delay
        setTimeout(() => {
            this.showNotice(
                "Chào mừng bạn trở lại! Hãy bật kết nối để bắt đầu nhận những yêu cầu chăm sóc mới quanh khu vực của bạn.",
                "info"
            );
            this.updateJoyPalFinancials();
        }, 1000);
    },

    // ==========================================
    // === JOYPAL DISPATCHER LOGIC ==============
    // ==========================================

    initJoyPalMap: function () {
        if (this.joypalMap || this.mapMode !== 'live') return;

        console.log("Initializing JoyPal Dispatcher Map - Hanoi...");
        const mapContainer = document.getElementById('joypal-map-live');
        if (!mapContainer) return;

        // Initialize Leaflet map centered on Hanoi (Dong Da / Hoan Kiem)
        this.joypalMap = L.map('joypal-map-live', {
            zoomControl: false,
            attributionControl: false
        }).setView([21.0285, 105.8542], 15);

        // Light-mode tile (closest to Google Maps style, no API key needed)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: ''
        }).addTo(this.joypalMap);

        // JoyPal location marker (Dong Da, Hanoi)
        const joypalIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="
                width: 48px; height: 48px;
                background: linear-gradient(135deg, #004D40, #00897B);
                border-radius: 50%;
                border: 3px solid white;
                display: flex; align-items: center; justify-content: center;
                box-shadow: 0 4px 15px rgba(0,122,255,0.6);
                font-size: 18px; color: white;
            "><i class='fa-solid fa-head-side-heart'></i></div>`,
            iconSize: [48, 48],
            iconAnchor: [24, 24]
        });
        L.marker([21.0285, 105.8542], { icon: joypalIcon }).addTo(this.joypalMap);

        // Add some demo hospital markers
        const hospitalIcon = L.divIcon({
            className: '',
            html: `<div style="background:#FF3B30;color:white;width:28px;height:28px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)">H</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
        });
        [
            [21.0188, 105.8431, 'BV Đại học Y Hà Nội'],
            [21.0356, 105.8561, 'BV Bạch Mai'],
            [21.0432, 105.8481, 'BV Trung ương QD 108']
        ].forEach(([lat, lng, name]) => {
            L.marker([lat, lng], { icon: hospitalIcon })
                .bindPopup(name)
                .addTo(this.joypalMap);
        });
    },

    _jobSimTimer: null,
    _jobCountdownTimer: null,
    _jobActiveTimer: null,
    _jobActiveSeconds: 0,
    _selectedServiceType: 'Joy-Home',

    // Commission constants
    JOYPAL_COMMISSION: 0.78, // JoyPal gets 78%
    JOYCARE_FEE: 0.22,       // JoyCare platform fee 22%

    // Mock job pool for Hanoi
    _mockJobs: [
        { name: 'Bác Nguyễn Văn An', avatar: 'https://i.pravatar.cc/150?img=34', addr: '45 Chùa Bộc, Đống Đa, Hà Nội', dist: '1.2 km', duration: '2 giờ', total: 200000, service: 'Joy-Home', lat: 21.026, lng: 105.841 },
        { name: 'Cô Trần Thị Lan', avatar: 'https://i.pravatar.cc/150?img=47', addr: '18 Khâm Thiên, Đống Đa, Hà Nội', dist: '0.8 km', duration: '3 giờ', total: 330000, service: 'Joy-Hospital', lat: 21.024, lng: 105.847 },
        { name: 'Chú Lê Văn Bình', avatar: 'https://i.pravatar.cc/150?img=12', addr: '52 Trường Trinh, Thanh Xuân, Hà Nội', dist: '2.1 km', duration: '1.5 giờ', total: 150000, service: 'Joy-Meal', lat: 21.018, lng: 105.843 },
        { name: 'Bác Phạm Thị Hoa', avatar: 'https://i.pravatar.cc/150?img=26', addr: '7 Đào Tấn, Ba Đình, Hà Nội', dist: '3.0 km', duration: '2 giờ', total: 200000, service: 'Joy-Tech', lat: 21.037, lng: 105.834 },
    ],
    _currentJob: null,

    toggleMapMode: function () {
        const staticMap = document.getElementById('joypal-map-static');
        const liveMap = document.getElementById('joypal-map-live');

        if (this.mapMode === 'static') {
            this.mapMode = 'live';
            if (staticMap) staticMap.classList.remove('active');
            if (liveMap) liveMap.classList.add('active');

            // Initialize if not done yet
            if (!this.joypalMap) {
                this.initJoyPalMap();
            }
            this.showNotification("Đã chuyển sang bản đồ trực tuyến", "info");
        } else {
            this.mapMode = 'static';
            if (staticMap) staticMap.classList.add('active');
            if (liveMap) liveMap.classList.remove('active');
            this.showNotification("Đã chuyển sang bản đồ tĩnh (Tiết kiệm pin)", "info");
        }
    },

    toggleJoyPalStatus: function () {
        if (this._joypalConnecting) return; // Prevent spam

        const pill = document.getElementById('joypal-status-pill');
        const pillText = pill ? pill.querySelector('span') : null;
        const icon = pill ? pill.querySelector('i') : null;
        const dot = document.getElementById('joypal-status-dot-container');
        const sheet = document.getElementById('joypal-bottom-sheet');
        const radar = document.getElementById('radar-ring');
        const scanner = document.getElementById('scanner-line');
        const mapContainer = document.getElementById('joypal-map-container');
        const statusBar = document.querySelector('.auto-status-bar');

        // Dispatcher specific UI elements
        const centerConnect = document.getElementById('joypal-center-connect');
        const dispatcherHeader = document.getElementById('joypal-dispatcher-header');
        const pillWrapper = document.getElementById('joypal-connection-pill-wrapper');

        if (!this.joypalState.isOnline) {
            // --- STARTING CONNECTION ---
            this._joypalConnecting = true;
            this.showNotification("Đang kết nối vào hệ thống điều phối...", "info");

            // Update UI to "Connecting" state
            if (pill) pill.classList.add('connecting');
            if (pillText) pillText.textContent = 'Đang kết nối...';
            if (radar) radar.classList.add('active');
            if (scanner) scanner.classList.add('active');

            // Finalize connection after delay
            setTimeout(() => {
                this.joypalState.isOnline = true;
                this._joypalConnecting = false;

                if (mapContainer) mapContainer.classList.remove('blurred');

                // NEW: Initialize Live Map automatically when going online if mode is live
                if (this.mapMode === 'live') {
                    if (!this.joypalMap) this.initJoyPalMap();
                    else setTimeout(() => { if (this.joypalMap) this.joypalMap.invalidateSize(); }, 300);
                }

                if (centerConnect) centerConnect.style.display = 'none';
                if (dispatcherHeader) dispatcherHeader.classList.remove('hide-offline');
                if (pillWrapper) pillWrapper.classList.remove('hide-offline');

                if (pill) {
                    pill.classList.remove('connecting');
                    pill.classList.add('active');
                }
                if (pillText) pillText.textContent = 'Trực tuyến';
                if (icon) icon.className = 'fa-solid fa-signal';

                if (dot) dot.classList.add('active');
                if (statusBar) {
                    statusBar.style.opacity = '1';
                    const statusSpan = statusBar.querySelector('span');
                    if (statusSpan) statusSpan.textContent = 'Đang tìm yêu cầu mới quanh đây...';
                }

                this.showNotification("Đã trực tuyến! Sẵn sàng nhận yêu cầu.", "success");
                this.loadPendingBookings(); // Show any available jobs
            }, 2000);
        } else {
            // --- GOING OFFLINE ---
            this.joypalState.isOnline = false;

            if (mapContainer) mapContainer.classList.add('blurred');
            if (centerConnect) centerConnect.style.display = 'flex';
            if (dispatcherHeader) dispatcherHeader.classList.add('hide-offline');
            if (pillWrapper) pillWrapper.classList.add('hide-offline');
            if (radar) radar.classList.remove('active');
            if (scanner) scanner.classList.remove('active');

            if (pill) {
                pill.classList.remove('active', 'connecting');
            }
            if (pillText) pillText.textContent = 'Bật kết nối';
            if (icon) icon.className = 'fa-solid fa-power-off';

            if (dot) dot.classList.remove('active');
            if (statusBar) {
                statusBar.style.opacity = '0.4';
                const statusSpan = statusBar.querySelector('span');
                if (statusSpan) statusSpan.textContent = 'Đang ngoại tuyến';
            }

            this.showNotification("Đã ngắt kết nối hệ thống.", "info");
            this.renderEmptyRequests(); // Clear job list
            this._stopJobSimulation();
        }
    },

    toggleHeatmap: function () {
        if (!this.joypalMap) {
            this.showNotification("Hãy bật bản đồ trực tuyến để xem vùng nhu cầu", "info");
            return;
        }

        this.joypalState.heatmapActive = !this.joypalState.heatmapActive;
        const btn = document.getElementById('btn-toggle-heatmap');

        if (this.joypalState.heatmapActive) {
            this.showNotification("Đang hiển thị vùng nhu cầu cao tại Hà Nội", "success");
            if (btn) btn.innerHTML = '<i class="fa-solid fa-layer-group"></i> Ẩn vùng nhu cầu';

            // Define hotzones in Hanoi
            const hotzones = [
                { lat: 21.018, lng: 105.84, radius: 450, color: '#FF3B30', label: 'Bách Khoa - Đống Đa' },
                { lat: 21.028, lng: 105.852, radius: 400, color: '#FF9500', label: 'Hoàn Kiếm' },
                { lat: 21.037, lng: 105.783, radius: 500, color: '#34C759', label: 'Cầu Giấy' }
            ];

            hotzones.forEach(zone => {
                const circle = L.circle([zone.lat, zone.lng], {
                    color: zone.color,
                    fillColor: zone.color,
                    fillOpacity: 0.2,
                    radius: zone.radius,
                    className: 'demand-circle'
                }).addTo(this.joypalMap);
                this.joypalState.heatmapCircles.push(circle);
            });
        } else {
            this.showNotification("Đã ẩn vùng nhu cầu", "info");
            if (btn) btn.innerHTML = '<i class="fa-solid fa-layer-group"></i> Vùng ưu tú';
            this.joypalState.heatmapCircles.forEach(c => this.joypalMap.removeLayer(c));
            this.joypalState.heatmapCircles = [];
        }
    },

    // NEW: Priority Area Logic
    openAreaModal: function () {
        document.getElementById('joypal-area-modal').style.display = 'flex';
    },
    closeAreaModal: function () {
        document.getElementById('joypal-area-modal').style.display = 'none';
    },
    applyPriorityAreas: function () {
        if (!this.joypalMap) {
            this.showNotification("Vui lòng bật kết nối để khoanh vùng trên bản đồ", "warning");
            this.closeAreaModal();
            return;
        }

        // Clear existing priority circles
        if (this.joypalState.priorityCircles) {
            this.joypalState.priorityCircles.forEach(c => this.joypalMap.removeLayer(c));
        }
        this.joypalState.priorityCircles = [];

        const activeChips = document.querySelectorAll('.area-chip.active');
        const coordsLookup = {
            "Dong Da": [21.0125, 105.8289],
            "Hoan Kiem": [21.0287, 105.8523],
            "Ba Dinh": [21.0353, 105.8152],
            "Hai Ba Trung": [21.0117, 105.8500],
            "Cau Giay": [21.0360, 105.7906],
            "Thanh Xuan": [20.9937, 105.8122]
        };

        if (activeChips.length === 0) {
            this.showNotification("Đã hủy bỏ khoanh vùng ưu tiên", "info");
        } else {
            activeChips.forEach(chip => {
                const district = chip.dataset.district;
                const coords = coordsLookup[district];
                if (coords) {
                    const circle = L.circle(coords, {
                        color: 'var(--primary-blue)',
                        fillColor: 'var(--primary-blue)',
                        fillOpacity: 0.15,
                        radius: 1200,
                        dashArray: '5, 10'
                    }).addTo(this.joypalMap);
                    this.joypalState.priorityCircles.push(circle);
                }
            });
            this.showNotification(`Đã khoanh vùng ưu tiên tại ${activeChips.length} quận`, "success");

            // Fly to the first selected area
            const firstCoords = coordsLookup[activeChips[0].dataset.district];
            this.joypalMap.flyTo(firstCoords, 13);

            // Spawn jobs immediately in these areas.
            setTimeout(() => {
                let spawns = 0;
                const interval = setInterval(() => {
                    const randomChip = activeChips[Math.floor(Math.random() * activeChips.length)];
                    const c = coordsLookup[randomChip.dataset.district];
                    if (c) {
                        const lat = c[0] + (Math.random() * 0.02 - 0.01);
                        const lng = c[1] + (Math.random() * 0.02 - 0.01);
                        const j = this._mockJobs[Math.floor(Math.random() * this._mockJobs.length)];
                        const jobInstance = { ...j, id: 'JOB-' + Math.floor(Math.random() * 10000), lat, lng, dist: (Math.random() * 2 + 0.5).toFixed(1) + ' km' };
                        this.spawnJobMarker(jobInstance);
                        this.showMiniNotification(jobInstance);
                    }
                    spawns++;
                    if (spawns >= 2) clearInterval(interval);
                }, 800);
            }, 1000);
        }
        this.closeAreaModal();
    },

    // NEW: Status Report Logic
    openStatusReportModal: function () {
        document.getElementById('joypal-report-modal').style.display = 'flex';
    },
    closeStatusReportModal: function () {
        document.getElementById('joypal-report-modal').style.display = 'none';
    },
    appendReportTag: function (el) {
        const textarea = document.getElementById('joypal-report-note');
        const tagText = el.innerText;
        if (textarea) {
            const current = textarea.value.trim();
            textarea.value = current ? current + '. ' + tagText : tagText;
        }
    },
    sendJobStatusReport: function () {
        const note = document.getElementById('joypal-report-note').value.trim();
        if (!note) {
            this.showNotification("Vui lòng nhập nội dung cập nhật", "warning");
            return;
        }

        this.showNotification("Đang gửi cập nhật cho gia đình...", "info");

        setTimeout(() => {
            this.closeStatusReportModal();
            this.showNotification("Đã gửi cập nhật thành công! Gia đình đã nhận được thông báo.", "success");
            this.celebrate(); // Confetti

            // Reset textarea
            document.getElementById('joypal-report-note').value = '';
        }, 1500);
    },

    _startJobSimulation: function () {
        this._stopJobSimulation();

        // AUTO-SPAWN: Trigger jobs every 10-20 seconds while online
        const spawn = () => {
            if (this.joypalState.isOnline && this.currentScreen === 'joypal-home') {
                this.triggerJobOffer();
            }
            this._jobSimTimer = setTimeout(spawn, 10000 + Math.random() * 10000);
        };
        this._jobSimTimer = setTimeout(spawn, 5000);
    },

    _stopJobSimulation: function () {
        if (this._jobSimTimer) clearTimeout(this._jobSimTimer);
        if (this._jobCountdownTimer) clearInterval(this._jobCountdownTimer);
        this._jobSimTimer = null;
        this._jobCountdownTimer = null;
        const overlay = document.getElementById('joypal-job-offer');
        if (overlay) overlay.style.display = 'none';
    },

    triggerJobOffer: function () {
        const job = this._mockJobs[Math.floor(Math.random() * this._mockJobs.length)];
        // Generate a temporary unique ID for this instance
        const jobId = 'JOB-' + Math.floor(Math.random() * 10000);
        const jobInstance = { ...job, id: jobId };

        const chips = document.querySelectorAll('.area-chip.active');
        if (chips.length > 0) {
            const coordsLookup = { "Dong Da": [21.0125, 105.8289], "Hoan Kiem": [21.0287, 105.8523], "Ba Dinh": [21.0353, 105.8152], "Hai Ba Trung": [21.0117, 105.8500], "Cau Giay": [21.0360, 105.7906], "Thanh Xuan": [20.9937, 105.8122] };
            const chip = chips[Math.floor(Math.random() * chips.length)];
            const c = coordsLookup[chip.dataset.district];
            if (c) {
                jobInstance.lat = c[0] + (Math.random() * 0.02 - 0.01);
                jobInstance.lng = c[1] + (Math.random() * 0.02 - 0.01);
                jobInstance.dist = (Math.random() * 2 + 0.5).toFixed(1) + ' km';
            }
        }

        this.spawnJobMarker(jobInstance);
        this.showMiniNotification(jobInstance);
    },

    showMiniNotification: function (job) {
        const notify = document.getElementById('joypal-mini-notify');
        const progress = document.getElementById('mini-job-progress');
        const nameEl = document.getElementById('mini-job-name');
        const detailEl = document.getElementById('mini-job-detail');
        const avatarEl = document.getElementById('mini-job-avatar');

        if (!notify || !progress) return;

        nameEl.textContent = job.name;
        detailEl.textContent = `${job.service} • ${job.dist}`;
        avatarEl.src = job.avatar;

        notify.style.display = 'flex';
        progress.style.width = '100%';

        // Pulse the progress bar
        setTimeout(() => {
            progress.style.width = '0%';
        }, 100);

        this._currentJob = job;

        // Overlay is no longer used for the initial "pop", but we can still use it for details if needed
        // For now, we only use the mini card
    },

    spawnJobMarker: function (job) {
        if (!this.joypalMap) return;

        console.log(`Spawning job marker for ${job.name} at [${job.lat}, ${job.lng}]`);

        const jobIcon = L.divIcon({
            className: 'job-marker-container',
            html: `<div class="job-marker-icon"><i class="fa-solid fa-person-walking-luggage"></i></div>`,
            iconSize: [34, 34],
            iconAnchor: [17, 17]
        });

        const marker = L.marker([job.lat, job.lng], { icon: jobIcon }).addTo(this.joypalMap);

        // Pulse effect for the map (circle)
        const pulseCircle = L.circle([job.lat, job.lng], {
            radius: 50,
            color: '#FF3B30',
            fillColor: '#FF3B30',
            fillOpacity: 0.3,
            weight: 0
        }).addTo(this.joypalMap);

        // Store references
        this.joypalState.activeJobMarkers[job.id] = { marker, pulseCircle, job };

        // Click interaction
        marker.on('click', () => {
            this.previewJob(job);
        });

        // Auto-remove after 20 seconds if not accepted
        setTimeout(() => {
            this.removeJobMarker(job.id);
            if (this.joypalState.isOnline && this.currentScreen === 'joypal-home') {
                this._startJobSimulation();
            }
        }, 20000);
    },

    removeJobMarker: function (jobId) {
        const data = this.joypalState.activeJobMarkers[jobId];
        if (data) {
            if (this.joypalMap) {
                this.joypalMap.removeLayer(data.marker);
                this.joypalMap.removeLayer(data.pulseCircle);
            }
            delete this.joypalState.activeJobMarkers[jobId];
        }
    },

    previewJob: function (job) {
        this._currentJob = job;

        // Hide mini notify if detail view is opened manually
        const notify = document.getElementById('joypal-mini-notify');
        if (notify) notify.style.display = 'none';

        // Center map on job
        if (this.joypalMap) {
            this.joypalMap.panTo([job.lat, job.lng]);
        }

        // Calculate net (78%) shown to JoyPal
        const netEarn = Math.round(job.total * this.JOYPAL_COMMISSION);
        const netK = (netEarn / 1000).toFixed(0);

        const el = (id) => document.getElementById(id);
        if (el('job-client-name')) el('job-client-name').textContent = job.name;
        if (el('job-client-addr')) el('job-client-addr').innerHTML = `<i class="fa-solid fa-location-dot"></i> ${job.addr}`;
        if (el('job-client-avatar')) el('job-client-avatar').src = job.avatar;
        if (el('job-earn-badge')) el('job-earn-badge').innerHTML = `+${netK}k<span style="font-size:10px;opacity:0.7;display:block;text-align:center">(78%)</span>`;
        if (el('job-duration')) el('job-duration').textContent = job.duration;
        if (el('job-distance')) el('job-distance').textContent = job.dist;
        if (el('job-service')) el('job-service').textContent = job.service;

        const overlay = el('joypal-job-offer');
        if (overlay) overlay.style.display = 'flex';

        let countdown = 15;
        const countEl = el('job-offer-countdown');
        if (this._jobCountdownTimer) clearInterval(this._jobCountdownTimer);
        this._jobCountdownTimer = setInterval(() => {
            countdown--;
            if (countEl) countEl.textContent = countdown;
            if (countdown <= 0) {
                clearInterval(this._jobCountdownTimer);
                this.declineJob(true);
            }
        }, 1000);
    },

    acceptJob: function () {
        if (this._jobCountdownTimer) clearInterval(this._jobCountdownTimer);
        const overlay = document.getElementById('joypal-job-offer');
        if (overlay) overlay.style.display = 'none';

        const notify = document.getElementById('joypal-mini-notify');
        if (notify) notify.style.display = 'none';

        const job = this._currentJob;
        if (!job) return;

        // Cleanup marker
        if (job.id) this.removeJobMarker(job.id);

        const netEarn = Math.round(job.total * this.JOYPAL_COMMISSION);
        const netK = (netEarn / 1000).toFixed(0);

        const el = (id) => document.getElementById(id);
        if (el('active-client-name')) el('active-client-name').textContent = job.name;
        if (el('active-client-avatar')) el('active-client-avatar').src = job.avatar;
        if (el('active-job-service-badge')) el('active-job-service-badge').textContent = job.service;
        if (el('active-job-earn')) el('active-job-earn').textContent = `+${netK}.000đ (78%)`;
        if (el('active-job-address')) el('active-job-address').textContent = job.addr;
        if (el('active-job-status-text')) el('active-job-status-text').textContent = 'Đang trên đường đến';
        if (el('active-job-eta')) el('active-job-eta').textContent = `~${job.dist.replace(' km', '')} phút`;

        // Init Active Job Map with Leaflet
        const mapEl = el('active-job-map');
        if (mapEl && !this._activeJobMap) {
            this._activeJobMap = L.map('active-job-map', { zoomControl: false, attributionControl: false })
                .setView([job.lat, job.lng], 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(this._activeJobMap);
            const clientIcon = L.divIcon({
                className: '',
                html: `<div style="background:#004D40;color:white;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 3px 10px rgba(0,0,0,0.3)"><i class='fa-solid fa-user' style='font-size:14px'></i></div>`,
                iconSize: [36, 36], iconAnchor: [18, 18]
            });
            L.marker([job.lat, job.lng], { icon: clientIcon }).addTo(this._activeJobMap);
        } else if (this._activeJobMap) {
            this._activeJobMap.setView([job.lat, job.lng], 15);
        }

        this.joypalState.activeJob = job;
        const countEl = el('joypal-count-display');
        if (countEl) countEl.textContent = parseInt(countEl.textContent || 0) + 1;

        this.showNotification(`Đã chấp nhận! Đang đến gặp ${job.name}`, 'success');
        this.navigate('joypal-job-detail');
    },

    declineJob: function (auto = false) {
        if (this._jobCountdownTimer) clearInterval(this._jobCountdownTimer);
        const overlay = document.getElementById('joypal-job-offer');
        if (overlay) overlay.style.display = 'none';

        const notify = document.getElementById('joypal-mini-notify');
        if (notify) notify.style.display = 'none';

        const job = this._currentJob;
        if (job && job.id) {
            this.removeJobMarker(job.id);
        }

        this._currentJob = null;

        if (!auto) this.showNotification('Bạn đã từ chối yêu cầu này.', 'info');
        else this.showNotification('Yêu cầu đã tự động bỏ qua.', 'info');

        // Queue next job after a while
        if (this.joypalState.isOnline) {
            this._startJobSimulation();
        }
    },

    arriveJob: function () {
        const arrived = document.getElementById('job-action-arrived');
        const progress = document.getElementById('job-action-progress');
        const statusText = document.getElementById('active-job-status-text');
        const etaEl = document.getElementById('active-job-eta');

        if (arrived) arrived.style.display = 'none';
        if (statusText) statusText.textContent = 'Đang chăm sóc';
        if (etaEl) etaEl.textContent = 'Đã đến';

        // Switch to split view
        const screen = document.getElementById('screen-joypal-job-detail');
        const infoView = document.getElementById('job-detail-info-view');
        const chatView = document.getElementById('job-detail-chat-view');

        if (screen) screen.classList.add('split-view');
        if (infoView) infoView.style.display = 'none';
        if (chatView) {
            chatView.style.display = 'flex';
            this._renderChat();
        }

        this.showNotification('Bạn đã đến nơi! Hệ thống đã mở khung chat liên lạc.', 'success');

        // Start work timer
        this._jobActiveSeconds = 0;
        if (this._jobActiveTimer) clearInterval(this._jobActiveTimer);
        this._jobActiveTimer = setInterval(() => {
            this._jobActiveSeconds++;
            const m = String(Math.floor(this._jobActiveSeconds / 60)).padStart(2, '0');
            const s = String(this._jobActiveSeconds % 60).padStart(2, '0');
            const timerEl = document.getElementById('job-active-timer');
            if (timerEl) timerEl.textContent = `${m}:${s}`;
        }, 1000);
    },

    sendJobChat: function () {
        const input = document.querySelector('.job-chat-input');
        const text = input ? input.value.trim() : '';
        if (!text) return;

        const msg = {
            id: Date.now(),
            sender: 'joypal',
            text: text,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        this.joypalState.chatMessages.push(msg);
        if (input) input.value = '';
        this._renderChat();

        // Simulated reply after 2 seconds
        setTimeout(() => {
            const reply = {
                id: Date.now(),
                sender: 'client',
                text: 'Cảm ơn cháu, bác thấy rồi nhé.',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            this.joypalState.chatMessages.push(reply);
            this._renderChat();
        }, 2000);
    },

    _renderChat: function () {
        const container = document.getElementById('job-chat-messages');
        if (!container) return;

        const defaultMsg = `<div class="chat-bubble client">Chào cháu, bác An đã sẵn sàng rồi nhé.<span class="time">12:10 PM</span></div>`;

        container.innerHTML = defaultMsg + this.joypalState.chatMessages.map(m => `
            <div class="chat-bubble ${m.sender}">
                ${m.text}
                <span class="time">${m.time}</span>
            </div>
        `).join('');

        container.scrollTop = container.scrollHeight;
    },

    completeJob: function () {
        // Show Health Report Modal before finalizing
        const modal = document.getElementById('joypal-report-modal');
        if (modal) modal.style.display = 'flex';

        // Reset modal fields and scroll top
        document.getElementById('report-bp').value = '';
        document.getElementById('report-hr').value = '';
        document.getElementById('report-meds').checked = false;
        this._currentReportMood = null;
        document.querySelectorAll('.report-mood-btn').forEach(b => {
            b.style.borderColor = 'var(--border-color)';
            b.style.background = 'var(--bg-dark)';
        });
    },

    _currentReportMood: null,
    setReportMood: function (btn, mood) {
        this._currentReportMood = mood;
        document.querySelectorAll('.report-mood-btn').forEach(b => {
            b.style.borderColor = 'var(--border-color)';
            b.style.background = 'var(--bg-dark)';
        });
        btn.style.borderColor = 'var(--success-green)';
        btn.style.background = 'rgba(52, 199, 89, 0.1)';
    },

    submitJobReport: function () {
        const bp = document.getElementById('report-bp').value.trim();
        const hr = document.getElementById('report-hr').value.trim();
        if (!bp || !hr || !this._currentReportMood) {
            alert("Vui lòng nhập đầy đủ chỉ số sức khỏe và trạng thái của Bác!");
            return;
        }

        const modal = document.getElementById('joypal-report-modal');
        const btn = modal.querySelector('.btn-primary');
        const originalText = btn.innerText;

        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang gửi báo cáo y tế...';
        btn.disabled = true;

        setTimeout(() => {
            if (btn) {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
            if (modal) modal.style.display = 'none';

            // Now finalize job and payment logic
            if (this._jobActiveTimer) clearInterval(this._jobActiveTimer);
            const job = this._currentJob || this._mockJobs[0];
            const totalPrice = job ? job.total : 110000;
            const netEarned = Math.round(totalPrice * this.JOYPAL_COMMISSION);   // 78%

            // Credit earned amount
            this.joypalState.earnings += netEarned;
            this.joypalState.withdrawable += netEarned;
            this.joypalState.completedJobs = (this.joypalState.completedJobs || 0) + 1;
            this.joypalState.gems += 15;

            this.updateJoyPalDashboard();

            this._currentJob = null;
            this.joypalState.activeJob = null;
            this.joypalState.chatMessages = [];

            if (this._activeJobMap) {
                this._activeJobMap.remove();
                this._activeJobMap = null;
            }

            // Notification for family and JoyPal
            this.showNotification(`Báo cáo y tế đã được gửi. +${netEarned.toLocaleString()}đ đã cộng vào ví!`, "success");

            // Back to home and reset UI
            this.navigate('joypal-home');
            this._stopJobSimulation();

            // Reset Job Detail visual state
            const screen = document.getElementById('screen-joypal-job-detail');
            const infoView = document.getElementById('job-detail-info-view');
            const chatView = document.getElementById('job-detail-chat-view');
            const arrived = document.getElementById('job-action-arrived');
            if (screen) screen.classList.remove('split-view');
            if (infoView) infoView.style.display = 'block';
            if (chatView) chatView.style.display = 'none';
            if (arrived) arrived.style.display = 'block';

            setTimeout(() => {
                const sheet = document.getElementById('joypal-bottom-sheet');
                if (sheet) sheet.classList.add('open');
            }, 500);
        }, 2000);
    },

    cancelActiveJob: function () {
        if (this._jobActiveTimer) clearInterval(this._jobActiveTimer);
        if (this._activeJobMap) {
            this._activeJobMap.remove();
            this._activeJobMap = null;
        }
        const arrived = document.getElementById('job-action-arrived');
        const progress = document.getElementById('job-action-progress');
        if (arrived) arrived.style.display = 'block';
        if (progress) progress.style.display = 'none';
        this._currentJob = null;
        this.showNotification('Bạn đã hủy công việc.', 'info');
        this.navigate('joypal-home');
    },

    openServiceModal: function () {
        const modal = document.getElementById('joypal-service-modal');
        if (modal) modal.style.display = 'flex';
    },

    closeServiceModal: function () {
        const modal = document.getElementById('joypal-service-modal');
        if (modal) modal.style.display = 'none';
    },

    setServiceType: function (name, icon) {
        this._selectedServiceType = name;
        const iconEl = document.getElementById('svc-type-icon');
        const labelEl = document.getElementById('svc-type-label');
        if (iconEl) iconEl.innerHTML = `<i class="fa-solid ${icon}"></i>`;
        if (labelEl) labelEl.textContent = name;
        this.closeServiceModal();
        this.showNotification(`Đã chọn: ${name}`, 'success');
    },

    updateJoyPalFinancials: function () {
        const headerEarnings = document.getElementById('joypal-earnings-display');
        if (headerEarnings) headerEarnings.textContent = this.joypalState.earnings.toLocaleString();

        const accEarnings = document.querySelector('#screen-joypal-account .financial-card:nth-child(1) .card-value');
        if (accEarnings) accEarnings.textContent = (this.joypalState.earnings / 1000).toFixed(0) + 'k';

        const withdrawableDisplay = document.getElementById('withdrawable-amount-display');
        if (withdrawableDisplay) withdrawableDisplay.textContent = this.joypalState.withdrawable.toLocaleString() + ' VND';

        const earningsTotal = document.getElementById('earnings-total-display');
        if (earningsTotal) earningsTotal.textContent = (this.joypalState.earnings / 1000).toFixed(0) + 'k';

        // Update Gems in UI
        const gemDisplay = document.querySelector('#screen-joypal-account .financial-card:nth-child(2) .card-value');
        if (gemDisplay) gemDisplay.textContent = this.joypalState.gems;

        const profileGems = document.querySelector('.reward-points span:first-child');
        if (profileGems) profileGems.innerHTML = `<i class="fa-solid fa-gem" style="color:#00BCD4"></i> ${this.joypalState.gems} Ngọc`;

        const walletDisplay = document.querySelector('#screen-joypal-account .financial-card:nth-child(3) .card-value');
        if (walletDisplay) walletDisplay.textContent = (this.joypalState.withdrawable / 1000).toFixed(0) + 'k';

        this.updateJoyPalAnalytics();
    },

    openWithdrawModal: function () {
        const modal = document.getElementById('joypal-withdraw-modal');
        if (modal) {
            modal.style.display = 'flex';
            const input = document.getElementById('withdraw-amount-input');
            if (input) input.value = Math.min(500000, this.joypalState.withdrawable);
        }
    },

    setMaxWithdraw: function () {
        const input = document.getElementById('withdraw-amount-input');
        if (input) input.value = this.joypalState.withdrawable;
    },

    setWithdrawMethod: function (btn, method) {
        this.joypalState.withdrawMethod = method;
        const chips = document.querySelectorAll('.method-chip');
        chips.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
    },

    confirmWithdraw: function () {
        const input = document.getElementById('withdraw-amount-input');
        const amount = parseInt(input.value);

        if (isNaN(amount) || amount <= 0) {
            this.showNotification('Vui lòng nhập số tiền hợp lệ.', 'error');
            return;
        }

        if (amount > this.joypalState.withdrawable) {
            this.showNotification('Số dư khả dụng không đủ.', 'error');
            return;
        }

        const confirmBtn = event.currentTarget;
        const originalText = confirmBtn.innerHTML;
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ĐANG XỬ LÝ...';

        setTimeout(() => {
            // Deduct from state
            this.joypalState.withdrawable -= amount;
            this.joypalState.earnings -= amount; // In this mock, earnings is total current balance

            // Update UI
            this.updateJoyPalFinancials();

            // Close modal
            document.getElementById('joypal-withdraw-modal').style.display = 'none';

            // Success feedback
            this.showNotification(`Rút tiền thành công! ${amount.toLocaleString()} VND đã được chuyển tới ${this.joypalState.withdrawMethod}.`, 'success');

            // Add to history
            const now = new Date();
            const dateStr = now.getFullYear() + '-' +
                String(now.getMonth() + 1).padStart(2, '0') + '-' +
                String(now.getDate()).padStart(2, '0') + ' ' +
                String(now.getHours()).padStart(2, '0') + ':' +
                String(now.getMinutes()).padStart(2, '0');

            this.joypalState.withdrawalHistory.unshift({
                id: 'TXN-' + Math.floor(1000 + Math.random() * 9000),
                date: dateStr,
                amount: amount,
                method: this.joypalState.withdrawMethod === 'MoMo' ? 'MoMo' : 'Ngân hàng',
                status: 'success'
            });

            // Add persistent notification
            this.joypalState.notifications.unshift({
                id: Date.now(),
                type: 'finance',
                title: 'Rút tiền thành công',
                text: `Bạn đã rút thành công ${amount.toLocaleString()}đ về ${this.joypalState.withdrawMethod} lúc ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ngày ${now.toLocaleDateString('vi-VN')}.`,
                time: 'Vừa xong',
                unread: true
            });

            this.updateWithdrawalHistoryUI();
            this.updateJoyPalNotificationsUI();

            // Reset button
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = originalText;
        }, 2000);
    },

    updateWithdrawalHistoryUI: function () {
        const container = document.getElementById('transaction-history-list');
        if (!container) return;

        if (this.joypalState.withdrawalHistory.length === 0) {
            container.innerHTML = `
                <div class="empty-state-card">
                    <i class="fa-solid fa-receipt" style="font-size: 40px; color: #333;"></i>
                    <h3>Chưa có giao dịch</h3>
                    <p>Các giao dịch rút tiền của bạn sẽ xuất hiện tại đây.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.joypalState.withdrawalHistory.map(txn => `
            <div class="transaction-item">
                <div class="txn-icon-wrapper">
                    ${txn.method === 'MoMo' ?
                `<img src="assets/momo-logo.png" style="width: 24px; border-radius: 6px;">` :
                `<i class="fa-solid fa-building-columns"></i>`}
                </div>
                <div class="txn-info">
                    <div class="method">${txn.method}</div>
                    <div class="date">${txn.date}</div>
                </div>
                <div class="txn-amount-status">
                    <div class="amount">-${txn.amount.toLocaleString()}đ</div>
                    <div class="status-badge-mini ${txn.status}">${txn.status === 'success' ? 'Thành công' : 'Chờ xử lý'}</div>
                </div>
            </div>
        `).join('');
    },

    updateJoyPalNotificationsUI: function () {
        const container = document.getElementById('joypal-notifications-list');
        if (!container) return;

        if (this.joypalState.notifications.length === 0) {
            container.innerHTML = `<div style="text-align:center;padding:40px;opacity:0.5;">Không có thông báo nào.</div>`;
            return;
        }

        const icons = {
            reward: { icon: 'fa-gift', color: 'var(--primary-orange)', bg: 'rgba(255,159,10,0.1)' },
            info: { icon: 'fa-circle-info', color: 'var(--primary-blue)', bg: 'rgba(0,122,255,0.1)' },
            finance: { icon: 'fa-money-bill-trend-up', color: 'var(--success-green)', bg: 'rgba(52,199,89,0.1)' }
        };

        container.innerHTML = this.joypalState.notifications.map(n => {
            const cfg = icons[n.type] || icons.info;
            return `
                <div class="notification-item ${n.unread ? 'unread' : ''}">
                    <div class="noti-icon" style="background: ${cfg.bg}; color: ${cfg.color};">
                        <i class="fa-solid ${cfg.icon}"></i>
                    </div>
                    <div class="noti-body">
                        <div class="title">${n.title}</div>
                        <div class="text">${n.text}</div>
                        <div class="time">${n.time}</div>
                    </div>
                </div>
            `;
        }).join('');
    },

    updateJoyPalAnalytics: function () {
        const dailyAcc = document.querySelector('.rate-card:nth-child(1) .rate-val.good');
        if (dailyAcc) dailyAcc.textContent = '100%';

        const bars = document.querySelectorAll('.rating-bar-row .fill');
        if (bars && bars.length === 5) {
            bars[0].style.width = '100%';
            bars[1].style.width = '0%';
            bars[2].style.width = '0%';
            bars[3].style.width = '0%';
            bars[4].style.width = '0%';
        }
    },

    toggleBottomSheet: function () {
        const sheet = document.getElementById('joypal-bottom-sheet');
        this.isBottomSheetOpen = !this.isBottomSheetOpen;
        if (this.isBottomSheetOpen) {
            sheet.classList.add('open');
        } else {
            sheet.classList.remove('open');
        }
    },

    showNotice: function (text, type = 'info') {
        const container = document.getElementById('joypal-notice-container');
        if (!container) return;

        const icon = type === 'warning' ? 'fa-triangle-exclamation' : 'fa-circle-info';
        const color = type === 'warning' ? '#E64A19' : 'var(--joypal-green-mid)';

        container.innerHTML = `
            <div class="notice-box" style="background: ${color};">
                <i class="fa-solid ${icon}"></i>
                <div class="notice-text">${text}</div>
                <i class="fa-solid fa-xmark" style="font-size: 14px; cursor: pointer; opacity: 0.7;" onclick="this.parentElement.remove()"></i>
            </div>
        `;
    },

    loginWithGoogle: async function () {
        try {
            await signInWithPopup(auth, googleProvider);
            this.showNotification("Đăng nhập Google thành công!", "success");
            this.navigate('home');
        } catch (e) {
            alert("Lỗi đăng nhập Google: " + e.message);
        }
    },

    confirmationResult: null,

    loginWithPhone: async function () {
        const phone = prompt("Nhập số điện thoại (định dạng +84...):", "+84");
        if (!phone) return;

        try {
            // Recaptcha check
            if (!window.recaptchaVerifier) {
                window.recaptchaVerifier = new RecaptchaVerifier(auth, 'login-recaptcha-container', {
                    'size': 'invisible'
                });
            }

            const appVerifier = window.recaptchaVerifier;
            this.confirmationResult = await signInWithPhoneNumber(auth, phone, appVerifier);

            const code = prompt("Nhập mã OTP đã được gửi về máy:");
            if (code) {
                await this.confirmationResult.confirm(code);
                this.showNotification("Xác thực SĐT thành công!", "success");
                this.navigate('home');
            }
        } catch (e) {
            alert("Lỗi đăng nhập SĐT: " + e.message);
            if (window.recaptchaVerifier) {
                window.recaptchaVerifier.clear();
                window.recaptchaVerifier = null;
            }
        }
    },

    register: async function () {
        const email = prompt("Nhập email để đăng ký:");
        if (!email) return;
        const password = prompt("Nhập mật khẩu (tối thiểu 6 ký tự):");
        if (!password || password.length < 6) {
            alert("Mật khẩu không hợp lệ!");
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            // Create user document in Firestore
            await setDoc(doc(db, "users", user.uid), {
                email: email,
                balance: 1250000,
                points: 2450,
                createdAt: new Date().toISOString()
            });
            this.showNotification("Đăng ký thành công!", "success");
            this.navigate('home');
        } catch (e) {
            alert("Lỗi đăng ký: " + e.message);
        }
    },

    loadUserData: async function () {
        if (!this.currentUser) return;
        const userDoc = await getDoc(doc(db, "users", this.currentUser.uid));
        if (userDoc.exists()) {
            const data = userDoc.data();
            this.userBalance = data.balance || 1250000;
            this.userPoints = data.points || 2450;

            const displayName = data.displayName || this.currentUser.email || this.currentUser.phoneNumber || "Thành viên JoyCare";

            // Update UI with real name
            const profileName = document.querySelector('.profile-info h2');
            if (profileName) profileName.innerText = displayName;

            const homeGreeting = document.getElementById('home-greeting-main') || document.querySelector('.greeting-main');
            if (homeGreeting) {
                homeGreeting.innerHTML = `Chào <span style="color: var(--primary-orange);">${displayName}</span>,<br>Tôi có thể giúp gì cho bạn?`;
            }

            this.updateWalletUI();
        }
    },

    logout: async function () {
        if (confirm("Bạn có chắc chắn muốn đăng xuất?")) {
            try {
                await auth.signOut();
                this.showNotification("Đã đăng xuất!", "success");
                this.navigate('role-selection');
            } catch (e) {
                alert("Lỗi đăng xuất: " + e.message);
            }
        }
    },

    saveState: async function () {
        if (!this.currentUser) return;
        await setDoc(doc(db, "users", this.currentUser.uid), {
            balance: this.userBalance,
            points: this.userPoints
        }, { merge: true });
    },

    // ==========================================
    // === HEALTH CHARTS ========================
    // ==========================================
    _hrChart: null,
    _bpChart: null,

    initHealthCharts: function () {
        // Load stored vitals from localStorage
        const stored = JSON.parse(localStorage.getItem('joycare_vitals') || 'null');
        const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
        const hrData = stored?.hr || [74, 71, 73, 72, 75, 70, 72];
        const bpSys = stored?.bpSys || [128, 122, 125, 120, 130, 118, 120];
        const bpDia = stored?.bpDia || [82, 80, 81, 80, 85, 78, 80];

        const chartDefaults = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#888', font: { size: 11 } } },
                y: { grid: { color: 'rgba(255,255,255,0.06)' }, ticks: { color: '#888', font: { size: 11 } } }
            }
        };

        // Destroy old charts to avoid canvas reuse error
        if (this._hrChart) { this._hrChart.destroy(); this._hrChart = null; }
        if (this._bpChart) { this._bpChart.destroy(); this._bpChart = null; }

        const ctxHr = document.getElementById('chart-heart-rate');
        if (ctxHr) {
            this._hrChart = new Chart(ctxHr, {
                type: 'line',
                data: {
                    labels: days,
                    datasets: [{
                        label: 'Nhịp tim (bpm)',
                        data: hrData,
                        borderColor: '#FF2D55',
                        backgroundColor: 'rgba(255, 45, 85, 0.12)',
                        borderWidth: 2.5,
                        pointRadius: 4,
                        pointBackgroundColor: '#FF2D55',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: { ...chartDefaults }
            });
        }

        const ctxBp = document.getElementById('chart-blood-pressure');
        if (ctxBp) {
            this._bpChart = new Chart(ctxBp, {
                type: 'line',
                data: {
                    labels: days,
                    datasets: [
                        {
                            label: 'Tâm thu',
                            data: bpSys,
                            borderColor: '#FF3B30',
                            backgroundColor: 'rgba(255,59,48,0.08)',
                            borderWidth: 2.5,
                            pointRadius: 4,
                            pointBackgroundColor: '#FF3B30',
                            tension: 0.4,
                            fill: true
                        },
                        {
                            label: 'Tâm trương',
                            data: bpDia,
                            borderColor: '#007AFF',
                            backgroundColor: 'rgba(0,122,255,0.08)',
                            borderWidth: 2,
                            pointRadius: 3,
                            pointBackgroundColor: '#007AFF',
                            tension: 0.4,
                            fill: false
                        }
                    ]
                },
                options: { ...chartDefaults, plugins: { legend: { display: true, labels: { color: '#aaa', font: { size: 11 } } } } }
            });
        }
    },

    switchChart: function (type) {
        document.getElementById('chart-wrapper-hr').style.display = type === 'hr' ? 'block' : 'none';
        document.getElementById('chart-wrapper-bp').style.display = type === 'bp' ? 'block' : 'none';
        document.getElementById('tab-hr').className = 'chart-tab' + (type === 'hr' ? ' active' : '');
        document.getElementById('tab-bp').className = 'chart-tab' + (type === 'bp' ? ' active' : '');
    },

    logVitals: function () {
        const hr = parseInt(document.getElementById('log-hr-input')?.value);
        const bp = parseInt(document.getElementById('log-bp-input')?.value);
        if (!hr && !bp) { this.showNotification('Vui lòng nhập ít nhất 1 chỉ số!', 'error'); return; }

        const stored = JSON.parse(localStorage.getItem('joycare_vitals') || '{}');
        const hrArr = stored.hr || [74, 71, 73, 72, 75, 70, 72];
        const bpSys = stored.bpSys || [128, 122, 125, 120, 130, 118, 120];
        const bpDia = stored.bpDia || [82, 80, 81, 80, 85, 78, 80];

        if (hr) { hrArr.shift(); hrArr.push(hr); }
        if (bp) { bpSys.shift(); bpSys.push(bp); bpDia.shift(); bpDia.push(Math.round(bp * 0.65)); }

        localStorage.setItem('joycare_vitals', JSON.stringify({ hr: hrArr, bpSys, bpDia }));

        // Update displayed values
        if (hr) {
            const el = document.getElementById('vital-hr');
            if (el) el.innerHTML = hr + ' <span class="vitals-unit">bpm</span>';
        }
        if (bp) {
            const el = document.getElementById('vital-bp');
            if (el) el.innerHTML = bp + '<span style="font-size:14px;color:#888">/' + Math.round(bp * 0.65) + '</span> <span class="vitals-unit">mmHg</span>';
        }

        document.getElementById('log-hr-input').value = '';
        document.getElementById('log-bp-input').value = '';
        this.showNotification('Chỉ số đã được ghi lại! ✅', 'success');
        this.initHealthCharts(); // re-render chart
    },

    // ==========================================
    // === MEDICINE MANAGEMENT ==================
    // ==========================================
    openMedModal: function () {
        const modal = document.getElementById('med-modal');
        if (modal) { modal.style.display = 'flex'; }
    },

    closeMedModal: function () {
        const modal = document.getElementById('med-modal');
        if (modal) { modal.style.display = 'none'; }
        // Clear inputs
        ['med-name-input', 'med-time-input', 'med-dose-input'].forEach(id => {
            const el = document.getElementById(id); if (el) el.value = '';
        });
    },

    addMedicine: function () {
        const name = document.getElementById('med-name-input')?.value.trim();
        const time = document.getElementById('med-time-input')?.value;
        const dose = document.getElementById('med-dose-input')?.value.trim() || '1 viên';
        const color = document.getElementById('med-color-input')?.value || 'blue';

        if (!name || !time) {
            this.showNotification('Vui lòng nhập tên thuốc và giờ uống!', 'error');
            return;
        }

        const meds = JSON.parse(localStorage.getItem('joycare_medicines') || '[]');
        meds.push({ id: Date.now(), name, time, dose, color, done: false });
        localStorage.setItem('joycare_medicines', JSON.stringify(meds));

        this.closeMedModal();
        this.renderMedicines();
        this.setupMedicineReminders();
        this.showNotification(`Đã thêm ${name} vào lịch nhắc! 💊`, 'success');
    },

    deleteMedicine: function (id) {
        let meds = JSON.parse(localStorage.getItem('joycare_medicines') || '[]');
        meds = meds.filter(m => m.id !== id);
        localStorage.setItem('joycare_medicines', JSON.stringify(meds));
        this.renderMedicines();
        this.showNotification('Dã xóa thuốc!', 'success');
    },

    toggleMedicineDone: function (id) {
        let meds = JSON.parse(localStorage.getItem('joycare_medicines') || '[]');
        meds = meds.map(m => m.id === id ? { ...m, done: !m.done } : m);
        localStorage.setItem('joycare_medicines', JSON.stringify(meds));
        this.renderMedicines();
    },

    renderMedicines: function () {
        const container = document.getElementById('med-list-dynamic');
        if (!container) return;

        const colorMap = {
            blue: { bg: 'rgba(0,122,255,0.1)', color: 'var(--primary-blue)', icon: 'fa-pills' },
            orange: { bg: 'rgba(255,159,10,0.1)', color: 'var(--primary-orange)', icon: 'fa-capsules' },
            green: { bg: 'rgba(52,199,89,0.1)', color: 'var(--success-green)', icon: 'fa-vial' },
            red: { bg: 'rgba(255,59,48,0.1)', color: 'var(--danger-red)', icon: 'fa-heart-pulse' }
        };

        // Default medicines if nothing saved
        const defaults = [
            { id: 1, name: 'Amlodipine (Huyết áp)', time: '08:00', dose: '1 viên', color: 'blue', done: true },
            { id: 2, name: 'Metformin (Tiểu đường)', time: '12:00', dose: '1 viên', color: 'orange', done: false },
            { id: 3, name: 'Vitamin B12', time: '08:00', dose: '1 viên', color: 'green', done: true }
        ];
        const meds = JSON.parse(localStorage.getItem('joycare_medicines') || 'null') || defaults;

        if (meds.length === 0) {
            container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-secondary);font-size:13px;">Chưa có thuốc nào. Nhấn “+ Thêm” để bắt đầu!</div>';
            return;
        }

        container.innerHTML = meds.map(med => {
            const cs = colorMap[med.color] || colorMap.blue;
            const timeFormatted = med.time ? med.time + ' AM' : '';
            return `
            <div class="med-card">
                <div class="med-icon" style="background:${cs.bg};color:${cs.color};">
                    <i class="fa-solid ${cs.icon}"></i>
                </div>
                <div class="med-info">
                    <div class="med-name">${med.name}</div>
                    <div class="med-schedule">${timeFormatted} • ${med.dose}</div>
                </div>
                <div class="med-check ${med.done ? 'done' : ''}" onclick="app.toggleMedicineDone(${med.id})">
                    <i class="fa-solid fa-check"></i>
                </div>
                <button class="med-delete" onclick="app.deleteMedicine(${med.id})" title="Xóa">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>`;
        }).join('');
    },

    // ==========================================
    // === NOTIFICATION REMINDERS ===============
    // ==========================================
    _reminderInterval: null,

    requestNotificationPermission: async function () {
        if (!('Notification' in window)) return;
        if (Notification.permission === 'default') {
            await Notification.requestPermission();
        }
    },

    setupMedicineReminders: function () {
        if (this._reminderInterval) clearInterval(this._reminderInterval);
        this._reminderInterval = setInterval(() => {
            const meds = JSON.parse(localStorage.getItem('joycare_medicines') || 'null');
            if (!meds || Notification.permission !== 'granted') return;

            const now = new Date();
            const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

            meds.forEach(med => {
                if (med.time === currentTime && !med.done) {
                    new Notification('⏰ Nhắc uống thuốc - JoyCare', {
                        body: `Đã đến giờ uống ${med.name} (${med.dose})!`,
                        icon: 'https://em-content.zobj.net/source/google/387/pill_1f48a.png'
                    });
                }
            });
        }, 60000); // check every minute
    },

    navigate: function (screenId) {
        if (screenId !== this.currentScreen && screenId !== 'ai-chat') {
            this.previousScreen = this.currentScreen;
        } else if (screenId === 'ai-chat' && this.currentScreen !== 'ai-chat') {
            this.previousScreen = this.currentScreen;
        }
        this.currentScreen = screenId;

        const screens = document.querySelectorAll('.screen');
        screens.forEach((s) => { s.classList.remove('active'); s.style.display = 'none'; });
        const target = document.getElementById('screen-' + screenId);
        if (target) {
            target.classList.add('active');
            if (screenId === 'finding') target.style.display = 'flex';
            else if (screenId === 'support') target.style.display = 'flex';
            else if (screenId === 'ai-chat') target.style.display = 'flex';
            else target.style.display = 'block';
        }
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        const navTarget = document.querySelector(`.nav-item[data-target="${screenId}"]`);
        if (navTarget) navTarget.classList.add('active');

        // Sync module tabs
        document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
        const moduleTab = document.querySelector(`.tab-item[onclick*="'${screenId}'"]`);
        if (moduleTab) moduleTab.classList.add('active');

        // Refresh dynamic UI components on navigation
        if (screenId === 'joypal-transactions') this.updateWithdrawalHistoryUI();
        if (screenId === 'joypal-notifications') this.updateJoyPalNotificationsUI();
        if (screenId === 'joypal-account') this.updateJoyPalFinancials();

        const noNavScreens = [
            'role-selection', 'login', 'joypal-login', 'register', 'vneid', 'finding', 'matched', 'confirm',
            'family-profile', 'payment', 'payment-success', 'thankyou', 'health', 'rewards', 'tracking', 'topup',
            'joypal-home', 'joypal-job-detail', 'joypal-account', 'joypal-earnings', 'joypal-rewards', 'joypal-wallets',
            'joypal-profile-detail', 'joypal-notifications', 'joypal-transactions'
        ];
        const bottomNav = document.querySelector('.bottom-nav');
        if (bottomNav) bottomNav.style.display = noNavScreens.includes(screenId) ? 'none' : 'flex';

        // Special handling for JoyPal Home & Accounts
        if (screenId.startsWith('joypal-')) {
            document.body.classList.add('joypal-mode');
            if (screenId === 'joypal-home' && this.mapMode === 'live') {
                setTimeout(() => this.initJoyPalMap(), 100);
            }
            this.updateJoyPalFinancials();
            if (screenId === 'joypal-earnings') {
                setTimeout(() => this.initEarningsChart(), 200);
            }
        } else {
            document.body.classList.remove('joypal-mode');
        }

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

        // Check Family Profile Status when entering the screen
        if (screenId === 'family-profile') {
            this.checkFamilyProfileStatus();
        }

        // Init health charts & medicines when navigating to health screen
        if (screenId === 'health') {
            setTimeout(() => {
                this.initHealthCharts();
                this.renderMedicines();
            }, 100);
        }

        // Init community feed
        if (screenId === 'community') {
            this.renderCommunityFeed();
        }

        // Always sync UI when navigating 
        this.updateWalletUI();

        // Specific JoyPal initialization
        if (screenId.startsWith('joypal-')) {
            this.updateJoyPalDashboard();
        }
    },

    // ================= ROLE SWITCHING & JOYPAL LOGIC =================

    switchToJoyPal: function () {
        // If not fully vetted, go to registration
        const vetting = this.joypalState.vetting;
        const isFullyVetted = vetting.layer1 && vetting.layer2 && vetting.layer3 && vetting.layer4;

        if (!isFullyVetted) {
            this.navigate('joypal-registration');
            this.updateVettingUI();
            return;
        }

        this.userRole = 'joypal';
        document.body.classList.add('joypal-mode');
        const switcher = document.getElementById('joypal-role-switcher');
        if (switcher) switcher.style.display = 'block';

        this.navigate('joypal-home');
        this.showNotification("Đã chuyển sang chế độ JoyPal", "success");
    },

    switchToCustomer: function () {
        this.userRole = 'customer';
        document.body.classList.remove('joypal-mode');
        const switcher = document.getElementById('joypal-role-switcher');
        if (switcher) switcher.style.display = 'none';

        this.navigate('home');
        this.showNotification("Đã trở lại chế độ Khách hàng", "success");
    },


    updateJoyPalDashboard: function () {
        // Update name and earnings
        const welcomeName = document.getElementById('joypal-welcome-name');
        if (welcomeName && this.currentUser) {
            welcomeName.innerText = `Chào ${this.currentUser.displayName || 'Tuấn'} 👋`;
        }

        // Sync header displays
        const headerEarnings = document.getElementById('joypal-earnings-display');
        const headerCount = document.getElementById('joypal-count-display');

        if (headerEarnings) headerEarnings.innerText = this.joypalState.earnings.toLocaleString();
        if (headerCount) headerCount.innerText = (this.joypalState.completedJobs || 0).toString();

        // Sync Account page displays
        const earningsTotal = document.getElementById('earnings-total-display');
        const earningsSub = document.getElementById('joypal-earnings');
        const withdrawableAmount = document.getElementById('withdrawable-amount-display');

        if (earningsTotal) earningsTotal.innerText = `${(this.joypalState.earnings / 1000).toLocaleString()}k`;
        if (earningsSub) earningsSub.innerText = `${(this.joypalState.earnings / 1000).toLocaleString()}k`;
        if (withdrawableAmount) withdrawableAmount.innerText = `${this.joypalState.withdrawable.toLocaleString()} VND`;
    },

    renderEmptyRequests: function () {
        const container = document.getElementById('joypal-requests-list');
        if (container) {
            container.innerHTML = `
                <div class="empty-requests">
                    <i class="fa-solid fa-bell-slash"></i>
                    <p>Bạn đang ở chế độ ngoại tuyến</p>
                </div>`;
        }
    },

    loadPendingBookings: function () {
        if (!this.joypalState.isOnline) return;

        const container = document.getElementById('joypal-requests-list');
        if (!container) return;

        // Mocking some incoming requests for the demo
        const mockRequests = [
            {
                id: 'req-1',
                customerName: 'Bác Nguyễn Văn A',
                avatar: 'https://i.pravatar.cc/150?img=12',
                service: 'Joy-Home',
                price: '140.000đ',
                location: 'Tôn Thất Tùng, Đống Đa',
                time: 'Ngay bây giờ'
            },
            {
                id: 'req-2',
                customerName: 'Chị Mai Lan',
                avatar: 'https://i.pravatar.cc/150?img=47',
                service: 'Joy-Hospital',
                price: '220.000đ',
                location: 'BV Bạch Mai, Giải Phóng',
                time: 'Hôm nay, 14:00'
            }
        ];

        container.innerHTML = mockRequests.map(req => `
            <div class="request-card new" id="request-${req.id}">
                <div class="request-header">
                    <span class="request-service">${req.service}</span>
                    <span class="request-price">${req.price}</span>
                </div>
                <div class="request-body">
                    <img src="${req.avatar}" class="customer-mini-avatar">
                    <div class="request-info">
                        <div class="customer-name">${req.customerName}</div>
                        <div class="request-location"><i class="fa-solid fa-location-dot"></i> ${req.location}</div>
                        <div style="font-size: 11px; color: var(--joypal-accent); margin-top: 4px; font-weight: 700;">${req.time}</div>
                    </div>
                </div>
                <div class="request-actions">
                    <button class="btn-decline" onclick="app.declineRequest('${req.id}')">Từ chối</button>
                    <button class="btn-accept" onclick="app.acceptBooking('${req.id}')">Chấp nhận</button>
                </div>
            </div>
        `).join('');
    },

    declineRequest: function (id) {
        const el = document.getElementById(`request-${id}`);
        if (el) {
            el.style.transform = 'translateX(100%)';
            el.style.opacity = '0';
            setTimeout(() => el.remove(), 300);
        }
    },

    // ================= EARNINGS & ANALYTICS =================

    updateJoyPalFinancials: function () {
        const totalEl = document.getElementById('earnings-total-display');
        const withdrawableEl = document.getElementById('withdrawable-amount-display');

        if (totalEl) totalEl.innerText = `${(this.joypalState.earnings / 1000).toLocaleString()}k`;
        if (withdrawableEl) withdrawableEl.innerText = `${this.joypalState.withdrawable.toLocaleString()} VND`;
    },

    initEarningsChart: function () {
        const canvas = document.getElementById('earningsChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (this._earningsChart) this._earningsChart.destroy();

        const data = this.joypalState.earningsHistory;

        this._earningsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => d.day),
                datasets: [{
                    label: 'Thu nhập (VNĐ)',
                    data: data.map(d => d.amount),
                    backgroundColor: (context) => {
                        const chart = context.chart;
                        const { ctx, chartArea } = chart;
                        if (!chartArea) return null;
                        const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                        gradient.addColorStop(0, 'rgba(52, 199, 89, 0.2)');
                        gradient.addColorStop(1, 'rgba(52, 199, 89, 1)');
                        return gradient;
                    },
                    borderRadius: 8,
                    borderSkipped: false,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        titleFont: { size: 12, weight: 'bold' },
                        bodyFont: { size: 14 },
                        callbacks: {
                            label: (context) => `${context.parsed.y.toLocaleString()}đ`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#888', font: { size: 10 } }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: {
                            color: '#888',
                            font: { size: 10 },
                            callback: (value) => value >= 1000 ? (value / 1000) + 'k' : value
                        }
                    }
                }
            }
        });
    },

    openWithdrawModal: function () {
        const modal = document.getElementById('joypal-withdraw-modal');
        const input = document.getElementById('withdraw-amount-input');
        if (modal) {
            modal.style.display = 'flex';
            if (input) input.value = Math.min(this.joypalState.withdrawable, 500000);
        }
    },

    setMaxWithdraw: function () {
        const input = document.getElementById('withdraw-amount-input');
        if (input) input.value = this.joypalState.withdrawable;
    },

    setWithdrawMethod: function (el, method) {
        document.querySelectorAll('.method-chip').forEach(c => c.classList.remove('active'));
        el.classList.add('active');
        this.joypalState.withdrawMethod = method;
    },

    confirmWithdraw: function () {
        const amount = parseInt(document.getElementById('withdraw-amount-input').value);
        if (isNaN(amount) || amount <= 0 || amount > this.joypalState.withdrawable) {
            this.showNotification("Số tiền không hợp lệ hoặc vượt quá số dư!", "error");
            return;
        }

        // Simulation: Success flow
        this.showNotification(`Đang thực hiện lệnh rút ${amount.toLocaleString()}đ...`, "info");

        setTimeout(() => {
            this.joypalState.withdrawable -= amount;
            this.updateJoyPalFinancials();
            document.getElementById('joypal-withdraw-modal').style.display = 'none';

            this.showNotification(`Rút tiền thành công! ${amount.toLocaleString()}đ đã được chuyển về ví ${this.joypalState.withdrawMethod}.`, "success");
        }, 1500);
    },

    acceptBooking: function (id) {
        const req = {
            id: id,
            customerName: 'Bác Nguyễn Văn A',
            avatar: 'https://i.pravatar.cc/150?img=12',
            service: 'Joy-Home',
            price: 140000,
            location: 'Tôn Thất Tùng, Đống Đa'
        };

        this.joypalState.activeJob = req;
        this.showNotification("Đã nhận công việc! Hãy bắt đầu di chuyển.", "success");

        // Populate new Split Screen info
        const nameEl = document.getElementById('active-client-name');
        const avatarEl = document.getElementById('active-client-avatar');
        const addrEl = document.getElementById('active-job-address');
        const statusEl = document.getElementById('active-job-status-text');

        if (nameEl) nameEl.innerText = req.customerName;
        if (avatarEl) avatarEl.src = req.avatar;
        if (addrEl) addrEl.innerText = req.location;
        if (statusEl) statusEl.innerText = "Đang trên đường đến";

        // Reset overlays
        const arriveOverlay = document.getElementById('job-action-arrived-overlay');
        const finishContainer = document.getElementById('job-finish-container');
        if (arriveOverlay) arriveOverlay.style.display = 'block';
        if (finishContainer) finishContainer.style.display = 'none';

        this.navigate('joypal-job-detail');

        // Initialize Map for active job
        setTimeout(() => this.initActiveJobMap(), 300);
    },

    acceptJob: function () {
        // From Job Offer Overlay
        const countdown = document.getElementById('job-offer-countdown');
        if (countdown) {
            this.acceptBooking('OFFER-' + Date.now());
            document.getElementById('joypal-job-offer').style.display = 'none';
        }
    },

    initActiveJobMap: function () {
        if (this.activeJobMap) {
            this.activeJobMap.remove();
        }

        const container = document.getElementById('active-job-map');
        if (!container) return;

        this.activeJobMap = L.map('active-job-map', {
            zoomControl: false,
            attributionControl: false
        }).setView([21.0067, 105.8248], 15);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.activeJobMap);

        // Marker for JoyPal (Me) - Dong Da
        L.marker([21.0285, 105.8542]).addTo(this.activeJobMap).bindPopup("Bạn đang ở đây");

        // Marker for Customer - Nearby
        const customerIcon = L.divIcon({
            html: `<div style="background:var(--primary-blue); width:30px; height:30px; border-radius:50%; border:3px solid white; display:flex; align-items:center; justify-content:center; color:white;"><i class="fa-solid fa-house-user"></i></div>`,
            className: ''
        });
        L.marker([21.0067, 105.8248], { icon: customerIcon }).addTo(this.activeJobMap).bindPopup("Khách hàng");
    },

    arriveJob: function () {
        this.showNotification("Xác nhận đã đến điểm hẹn!", "success");
        const statusEl = document.getElementById('active-job-status-text');
        if (statusEl) statusEl.innerText = "Đang thực hiện dịch vụ";

        const arriveOverlay = document.getElementById('job-action-arrived-overlay');
        const finishContainer = document.getElementById('job-finish-container');
        if (arriveOverlay) arriveOverlay.style.display = 'none';
        if (finishContainer) finishContainer.style.display = 'block';

        // Add arrival message to chat
        this.addJobChatMessage("JoyPal đã có mặt tại địa chỉ hẹn. Đang bắt đầu chăm sóc bác.", "sent");

        // Request health update pulse
        setTimeout(() => {
            this.showNotice("Hãy cập nhật tình trạng sức khỏe của bác sau khi bắt đầu ca làm nhé.", "info");
        }, 2000);
    },

    sendJobChat: function () {
        const input = document.getElementById('jp-chat-input');
        if (!input || !input.value.trim()) return;

        const text = input.value.trim();
        this.addJobChatMessage(text, "sent");
        input.value = '';

        // Auto reply simulation
        setTimeout(() => {
            this.addJobChatMessage("Cảm ơn cháu, gia đình yên tâm rồi.", "received");
        }, 1500);
    },

    addJobChatMessage: function (text, type) {
        const container = document.getElementById('job-chat-messages');
        if (!container) return;

        const now = new Date();
        const timeStr = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

        const msg = document.createElement('div');
        msg.className = `msg-bubble-jp ${type}`;
        msg.innerHTML = `
            ${text}
            <span class="msg-time">${timeStr}</span>
        `;
        container.appendChild(msg);
        container.scrollTop = container.scrollHeight;
    },

    openStatusReportModal: function () {
        const modal = document.getElementById('joypal-report-modal');
        if (modal) modal.style.display = 'flex';
    },

    setReportMood: function (el, mood) {
        document.querySelectorAll('.report-mood-btn').forEach(b => b.style.borderColor = 'var(--border-color)');
        el.style.borderColor = 'var(--primary-blue)';
    },

    finishJob: function () {
        this.openStatusReportModal();
    },

    submitJobReport: function () {
        const modal = document.getElementById('joypal-report-modal');
        if (modal) modal.style.display = 'none';
        this.completeJob();
    },

    confirmCancelJob: function () {
        if (confirm("Bạn có chắc muốn hủy ca làm này? Việc hủy ca gần sát giờ hẹn có thể bị trừ điểm EQ.")) {
            this.joypalState.activeJob = null;
            this.navigate('joypal-home');
        }
    },

    completeJob: function () {
        this.showNotification("Ca làm đã hoàn tất!", "success");
        this.navigate('joypal-home');

        // Update dashboard stats
        const earned = 110000;
        this.joypalState.earnings += earned;
        this.joypalState.withdrawable += earned;
        this.joypalState.completedJobs = (this.joypalState.completedJobs || 0) + 1;
        this.joypalState.activeJob = null;

        // Sync UI
        this.updateJoyPalDashboard();

        setTimeout(() => {
            this.showNotice(`Thu nhập +${earned.toLocaleString()}đ đã được cộng vào tài khoản của bạn.`, "success");
            if (typeof confetti === 'function') {
                confetti({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 }
                });
            }
        }, 500);
    },


    filterServices: function (category) {
        // Update chip UI
        const chips = document.querySelectorAll('.filter-chip');
        chips.forEach(c => {
            if (c.dataset.filter === category) {
                c.classList.add('selected');
                c.style.background = 'var(--primary-blue)';
                c.style.color = 'white';
                c.style.border = 'none';
            } else {
                c.classList.remove('selected');
                c.style.background = 'transparent';
                c.style.color = 'var(--text-secondary)';
                c.style.border = '1px solid var(--border-color)';
            }
        });

        // Filter items
        const items = document.querySelectorAll('.filterable-item');
        let hasServices = false;
        let hasPackages = false;

        items.forEach(item => {
            if (category === 'all' || item.dataset.category === category) {
                item.style.display = '';
                if (item.classList.contains('service-card')) hasServices = true;
                if (item.classList.contains('package-card')) hasPackages = true;
            } else {
                item.style.display = 'none';
            }
        });

        const grid = document.getElementById('services-grid-container');
        const sTitle = document.getElementById('section-services-title');
        if (sTitle && grid) {
            sTitle.style.display = hasServices ? 'block' : 'none';
            grid.style.display = hasServices ? 'grid' : 'none';
        }

        const pTitle = document.getElementById('section-packages-header');
        const pList = document.getElementById('packages-list-container');
        if (pTitle && pList) {
            pTitle.style.display = hasPackages ? 'flex' : 'none';
            pList.style.display = hasPackages ? 'flex' : 'none';
        }
    },

    searchServices: function () {
        const input = document.getElementById('service-search-input');
        if (!input) return;
        const query = input.value.toLowerCase().trim();

        // If filtering by search, reset visual chips
        if (query.length > 0) {
            const chips = document.querySelectorAll('.filter-chip');
            chips.forEach(c => {
                c.classList.remove('selected');
                c.style.background = 'transparent';
                c.style.color = 'var(--text-secondary)';
                c.style.border = '1px solid var(--border-color)';
            });
        }

        const items = document.querySelectorAll('.filterable-item');
        let hasServices = false;
        let hasPackages = false;

        items.forEach(item => {
            const name = item.dataset.name || '';
            if (name.includes(query)) {
                item.style.display = '';
                if (item.classList.contains('service-card')) hasServices = true;
                if (item.classList.contains('package-card')) hasPackages = true;
            } else {
                item.style.display = 'none';
            }
        });

        const grid = document.getElementById('services-grid-container');
        const sTitle = document.getElementById('section-services-title');
        if (sTitle && grid) {
            sTitle.style.display = hasServices ? 'block' : 'none';
            grid.style.display = hasServices ? 'grid' : 'none';
        }

        const pTitle = document.getElementById('section-packages-header');
        const pList = document.getElementById('packages-list-container');
        if (pTitle && pList) {
            pTitle.style.display = hasPackages ? 'flex' : 'none';
            pList.style.display = hasPackages ? 'flex' : 'none';
        }
    },

    updateWalletUI: function () {
        const balanceEl = document.getElementById('header-balance');
        const pointsEl = document.getElementById('header-points');
        const profileBalanceEl = document.getElementById('profile-balance');
        const formattedBalance = this.userBalance.toLocaleString('vi-VN') + 'đ';

        if (balanceEl) balanceEl.innerText = formattedBalance;
        if (profileBalanceEl) profileBalanceEl.innerText = formattedBalance;
        if (pointsEl) pointsEl.innerText = this.userPoints.toLocaleString('vi-VN');

        const rewardsPointsEl = document.getElementById('rewards-points');
        if (rewardsPointsEl) rewardsPointsEl.innerText = this.userPoints.toLocaleString('vi-VN');
    },

    triggerSOS: function () {
        if (confirm('⚠️ CẢNH BÁO KHẨN CẤP: Gửi tín hiệu SOS đến gia đình và đội ngũ y tế JoyCare?')) {
            alert('🚨 Tín hiệu SOS đã được gửi! \n- Vị trí hiện tại: 10 Tôn Thất Tùng, Hà Nội \n- Đội y tế sẽ liên lạc trong vòng 60 giây.');
            console.log('SOS Triggered at:', new Date().toISOString());
        }
    },

    selectPackage: function (packageId) {
        const packages = {
            'basic': { title: 'Gói Hiếu Nghĩa Cơ Bản', price: 1500000, desc: '3 buổi/tuần' },
            'premium': { title: 'Gói Chăm Sóc Toàn Diện', price: 3500000, desc: '7 buổi/tuần' }
        };
        const p = packages[packageId];
        if (p) {
            alert(`Bạn đã chọn ${p.title} (${p.desc}). \nChúng tôi sẽ liên hệ để xác nhận lịch trình cụ thể.`);
        }
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
        const question = input.value.trim();
        const history = document.getElementById('support-chat-history');
        if (!history) return;

        const timeNow = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        history.insertAdjacentHTML('beforeend', `
            <div style="display:flex;flex-direction:column;align-items:flex-end;margin-bottom:12px;">
                <div style="background:var(--primary-blue);color:white;padding:10px 14px;border-radius:18px;border-bottom-right-radius:4px;max-width:80%;font-size:13px;">${question}</div>
                <span style="font-size:10px;color:var(--text-secondary);margin-top:3px;">${timeNow}</span>
            </div>`);

        input.value = '';
        history.scrollTop = history.scrollHeight;

        // AI Support Response
        this.getAIResponse(question, history, 'support');
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
        history.scrollTop = history.scrollHeight;

        this.getAIResponse(question, history, 'support');
    },
    getAIResponse: async function (question, historyElement, contextType) {
        // Tạo ID để làm hiệu ứng "Loading..."
        const msgId = 'ai-msg-' + Date.now();
        const timeNow = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

        // 1. Hiện khung "JoyAI đang suy nghĩ..." lên màn hình

        historyElement.insertAdjacentHTML('beforeend', `
            <div id="${msgId}" style="display:flex;flex-direction:column;align-items:flex-start;margin-bottom:12px;">
                <div style="background:#f1f1f1;color:var(--text-primary);padding:10px 14px;border-radius:18px;border-bottom-left-radius:4px;max-width:80%;font-size:13px;line-height:1.5;">
                    <i class="fa-solid fa-circle-notch fa-spin" style="color: var(--primary-orange);"></i> JoyAI đang suy nghĩ...
                </div>
            </div>`);
        historyElement.scrollTop = historyElement.scrollHeight;

        try {
            // 2. Gọi API Groq tập trung
            const responseText = await this._callGroq(question);


            // 3. Format lại chữ cho đẹp (in đậm, xuống dòng)
            const formattedText = responseText
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n/g, '<br>');

            // 4. Thay dòng chữ "Đang suy nghĩ..." bằng câu trả lời của AI
            const msgDiv = document.getElementById(msgId);
            if (msgDiv) {
                msgDiv.innerHTML = `
                    <div style="background:#f1f1f1;color:var(--text-primary);padding:10px 14px;border-radius:18px;border-bottom-left-radius:4px;max-width:80%;font-size:13px;line-height:1.5;">
                        ${formattedText}
                    </div>
                    <span style="font-size:10px;color:var(--text-secondary);margin-top:3px;">${timeNow}</span>
                `;
            }
            historyElement.scrollTop = historyElement.scrollHeight;

        } catch (error) {
            console.error("Lỗi Groq API:", error);
            // Hiện thông báo lỗi nếu gặp vấn đề (CORS, Quota, Key...)
            const msgDiv = document.getElementById(msgId);
            if (msgDiv) {
                msgDiv.innerHTML = `
                    <div style="background:#ffebee;color:#c62828;padding:10px 14px;border-radius:18px;border-bottom-left-radius:4px;max-width:80%;font-size:13px;">
                        Xin lỗi, con đang gặp chút trục trặc kết nối (CORS/API). Cô/chú thử lại sau giúp con nha! 😔<br>
                        <small style="font-size: 10px;">Chi tiết: ${error.message}</small>
                    </div>
                `;
            }
        }
    }, servicesData: {
        'hospital': { title: 'Joy-Hospital', tagline: 'Tháp tùng đi viện', isVip: false, desc: 'Hỗ trợ di chuyển, lấy số và xếp hàng tại bệnh viện.', features: ['Đặt xe và dìu đỡ tận nơi', 'Hỗ trợ lấy số thứ tự, sổ khám bệnh', 'Xếp hàng chờ lấy thuốc', 'Nhắc nhở lịch trình'], price: 110000, priceText: '110k/h' },
        'vip': { title: 'Hospital VIP', tagline: 'Trọn gói & Live Tracking', isVip: true, desc: 'Dịch vụ cao cấp, hỗ trợ toàn diện và báo cáo Live cho con cái.', features: ['Ưu tiên JoyPal EQ > 90', 'Cập nhật hình ảnh/video Live', 'Ghi chép lời dặn bác sĩ', 'Hỗ trợ thanh toán viện phí'], price: 450000, priceText: '450.000đ/ca' },
        'home': { title: 'Joy-Home', tagline: 'Trò chuyện tại nhà', isVip: false, desc: 'Giải tỏa cô đơn bằng những giờ bầu bạn ấm cúng.', features: ['Trò chuyện tâm giao', 'Đọc báo, xem TV, nghe nhạc xưa', 'Đi dạo quanh khu vực', 'Đảm bảo an toàn cơ bản'], price: 70000, priceText: '70k/h' },
        'tech': { title: 'Joy-Tech', tagline: 'Gia sư công nghệ', isVip: false, desc: 'Giúp người lớn tuổi làm chủ smartphone.', features: ['Hướng dẫn gọi Video Call', 'Dạy xem Youtube, đọc báo mạng', 'Cài đặt Wifi, chỉnh cỡ chữ', 'Nhận diện lừa đảo mạng'], price: 70000, priceText: '70k/h' },
        'event': { title: 'Joy-Event', tagline: 'Sự kiện/Họp lớp', isVip: false, desc: 'Đồng hành an toàn tham gia các buổi tiệc, gặp gỡ.', features: ['Chuẩn bị trang phục tươm tất', 'Tháp tùng, dìu đỡ phương tiện', 'Chụp ảnh, quay video kỷ niệm', 'Nhắc uống thuốc đúng cữ'], price: 90000, priceText: '90k/h' },
        'meal': { title: 'Joy-Meal', tagline: 'Bữa ăn dinh dưỡng', isVip: false, desc: 'Chuẩn bị và cùng thưởng thức bữa ăn ấm cúng.', features: ['Đi chợ tươi sạch', 'Nấu theo chế độ bệnh', 'Bầu bạn dùng bữa', 'Dọn dẹp khu bếp'], price: 90000, priceText: '90k/h' },
        // Care Packages
        'basic': { title: 'Gói Hiếu Nghĩa', tagline: 'Định kỳ 3 buổi/tuần', isVip: false, desc: 'Gói chăm sóc cơ bản giúp người thân luôn có người bầu bạn và theo dõi sức khỏe.', features: ['3 buổi chăm sóc / tuần', 'JoyPal cố định (quen thuộc)', 'Báo cáo sức khỏe hàng tuần', 'Hỗ trợ nhắc thuốc & đi dạo', 'Giảm 5% khi đặt thêm dịch vụ lẻ'], price: 1500000, priceText: '1.5tr/tháng', isPackage: true },
        'premium': { title: 'Gói Toàn Diện', tagline: 'Chăm sóc 7 ngày/tuần', isVip: true, desc: 'Sự an tâm tuyệt đối với sự hiện diện của JoyPal mỗi ngày và hệ thống theo dõi 24/7.', features: ['7 buổi chăm sóc / tuần (Trọn tuần)', 'Ưu tiên JoyPal VIP (EQ > 90)', 'Theo dõi vị trí & sức khỏe 24/7', 'Tặng bộ máy đo huyết áp thông minh', 'Miễn phí tháp tùng đi viện 1 lần/tháng'], price: 3500000, priceText: '3.5tr/tháng', isPackage: true }
    },

    joypalsData: {
        'tuan': {
            name: 'Phạm Minh Tuấn',
            age: 21,
            avatar: 'https://i.pravatar.cc/150?img=11',
            school: 'Đại học Y Hà Nội (Năm 3)',
            rating: 4.9,
            eq: 94,
            certs: ['Sơ cứu Y tế', 'Tâm lý người già'],
            interests: ['Cờ tướng', 'Nhạc xưa', 'Nấu ăn']
        },
        'my': {
            name: 'Nguyễn Lan My',
            age: 22,
            avatar: 'https://i.pravatar.cc/150?img=5',
            school: 'ĐH Điều dưỡng HN',
            rating: 4.8,
            eq: 92,
            certs: ['Điều dưỡng cơ bản', 'Dinh dưỡng'],
            interests: ['Đọc sách', 'Yoga', 'Chăm sóc cây']
        }
    },

    currentServiceId: null,

    showServiceDetail: function (id) {
        this.currentServiceId = id;
        const data = this.servicesData[id];
        if (!data) return;
        document.getElementById('modal-service-title').innerText = data.title;
        document.getElementById('modal-service-tagline').innerText = data.tagline;
        document.getElementById('modal-service-desc').innerText = data.desc;
        document.getElementById('modal-service-badge').style.display = data.isVip ? 'block' : 'none';
        document.getElementById('modal-service-features').innerHTML = data.features.map(f => `<li>${f}</li>`).join('');

        const btn = document.getElementById('modal-service-btn');
        if (btn) {
            if (data.isPackage) {
                btn.innerText = 'Đăng ký gói này ngay';
                btn.onclick = () => { this.closeServiceDetail(); this.selectPackage(id); };
            } else {
                btn.innerText = 'Đặt lịch dịch vụ này';
                btn.onclick = () => { this.bookFromModal(); };
            }
        }

        let priceEl = document.getElementById('modal-service-price');
        if (!priceEl) {
            priceEl = document.createElement('div');
            priceEl.id = 'modal-service-price';
            priceEl.style.cssText = 'font-weight:bold;color:var(--primary-orange);font-size:16px;margin-top:12px;';
            document.getElementById('modal-service-features').parentNode.appendChild(priceEl);
        }
        priceEl.innerText = '💰 Giá: ' + (data.priceText || '');
        document.getElementById('service-modal').style.display = 'flex';
    },

    bookFromModal: function () {
        this.closeServiceDetail();
        this.navigate('booking');

        if (this.currentServiceId) {
            const rads = document.getElementsByName('booking-service');
            for (let i = 0; i < rads.length; i++) {
                if (rads[i].value === this.currentServiceId) {
                    rads[i].checked = true;
                    this.toggleVipPicker(this.currentServiceId);
                    break;
                }
            }
        }
    },

    togglePreference: function (el) {
        el.classList.toggle('selected');
        // In a real app, this would save the state to match JoyPals
    },

    redeemReward: function (rewardId) {
        const rewards = {
            'v500': { title: 'Voucher Joy-Home 2h', cost: 500 },
            's2500': { title: 'Sữa Ensure Gold 850g', cost: 2500 }
        };
        const r = rewards[rewardId];
        if (r) {
            if (this.userPoints >= r.cost) {
                if (confirm(`Bạn có chắc chắn muốn đổi ${r.cost} điểm lấy ${r.title}?`)) {
                    this.userPoints -= r.cost;
                    this.saveState();
                    this.updateWalletUI();
                    alert(`✅ Đổi quà thành công! \n${r.title} đã được thêm vào kho quà của bạn.`);
                }
            } else {
                alert('⚠️ Bạn không đủ điểm để đổi quà này.');
            }
        }
    },

    askAI: async function () {
        const hr = document.getElementById('vital-hr')?.innerText.split(' ')[0] || "72";
        const bp = document.getElementById('vital-bp')?.innerText.split(' ')[0] || "120/80";

        const prompt = `Đây là các chỉ số sức khỏe hiện tại của Bác người thân khách hàng: Nhịp tim ${hr} bpm, Huyết áp ${bp} mmHg. 
        Con hãy đưa ra một lời khuyên ngắn gọn, ấm áp (xưng con) về tình trạng này và gợi ý dịch vụ JoyCare nếu cần.`;

        this.showNotification("🤖 JoyAI đang phân tích dữ liệu...", "info");

        try {
            const response = await this._callGroq(prompt);
            alert("🤖 JoyAI tư vấn sức khỏe: \n\n" + response);
        } catch (e) {
            console.error("AI Error:", e);
            alert("🤖 JoyAI: Con xin lỗi, hệ thống đang bận một chút. Bác vẫn ổn định ạ!");
        }
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

        const profileData = localStorage.getItem('joycare_family_profile');
        const profile = profileData ? JSON.parse(profileData) : null;

        // Determine the best JoyPal based on profile
        let palId = 'tuan'; // Default
        if (profile) {
            // Logic: If user prefers Female ("Nữ"), pick My
            if (profile.requirements.gender === 'Nữ') palId = 'my';
            // Specific specialized matching logic could go here
        }

        const pal = this.joypalsData[palId];

        setTimeout(() => {
            // Update Matched Screen UI
            const avatar = document.getElementById('matched-avatar');
            const name = document.getElementById('matched-name');
            const school = document.getElementById('matched-school');
            const rating = document.getElementById('matched-rating');
            const tagsContainer = document.getElementById('matched-tags');

            if (avatar) avatar.src = pal.avatar;
            if (name) name.innerText = `JoyPal ${pal.name.split(' ').pop()}, ${pal.age}`;
            if (school) school.innerText = pal.school;
            if (rating) rating.innerHTML = `<i class="fa-solid fa-star text-orange"></i> ${pal.rating} (120+)`;

            if (tagsContainer) {
                let tagsHtml = '';
                // Add Reasons based on Profile
                if (profile) {
                    if (profile.diseases.includes('Tim mạch') || profile.diseases.includes('Huyết áp cao')) {
                        tagsHtml += `<span class="tag" style="background: rgba(43, 94, 226, 0.1); color: var(--primary-blue);"><i class="fa-solid fa-heart-pulse"></i> Chuyên tim mạch</span>`;
                    }
                    if (profile.hobbies.includes('Đánh cờ') && palId === 'tuan') {
                        tagsHtml += `<span class="tag" style="background: rgba(255, 149, 0, 0.1); color: var(--primary-orange);"><i class="fa-solid fa-chess"></i> Cao thủ cờ tướng</span>`;
                    }
                    if (profile.requirements.skills.includes('Sơ cứu')) {
                        tagsHtml += `<span class="tag" style="background: rgba(52, 199, 89, 0.1); color: var(--success-green);"><i class="fa-solid fa-kit-medical"></i> Chứng chỉ Sơ cứu</span>`;
                    }
                }

                // Add Certs (Standard)
                pal.certs.forEach(cert => {
                    tagsHtml += `<span class="tag">${cert}</span>`;
                });
                tagsContainer.innerHTML = tagsHtml;
            }

            this.navigate('matched');
        }, 3000);
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

            // Save to Firestore
            if (this.currentUser) {
                addDoc(collection(db, "bookings"), {
                    userId: this.currentUser.uid,
                    serviceId: this.currentBooking.serviceId,
                    title: this.currentBooking.title,
                    price: this.currentBooking.price,
                    hours: this.currentBooking.hours,
                    address: this._storedAddress,
                    time: document.getElementById('confirm-time')?.innerText || "",
                    status: "confirmed",
                    createdAt: serverTimestamp()
                }).catch(err => console.error("Error saving booking:", err));
            }

            // SUCCESS FLOW ENHANCEMENT
            if (payMethod !== 'momo') {
                if (btn) {
                    btn.innerHTML = '<i class="fa-solid fa-check" style="margin-right:6px;"></i> Thanh toán thành công!';
                    btn.style.background = 'linear-gradient(135deg, #34C759, #248A3D)';
                }

                setTimeout(() => {
                    this.navigate('payment-success');
                    this.triggerConfetti();

                    // Set booking details for the modal
                    const bookingId = "JC-2026-" + Math.floor(1000 + Math.random() * 9000);
                    const idDisplay = document.getElementById('booking-id-display');
                    if (idDisplay) idDisplay.innerText = bookingId;

                    // Populate detailed modal
                    document.getElementById('detail-booking-id').innerText = bookingId;
                    document.getElementById('detail-service-name').innerText = this.currentBooking.title;
                    document.getElementById('detail-booking-time').innerText = document.getElementById('confirm-time')?.innerText || '--:--, --/--/----';
                    document.getElementById('detail-booking-address').innerText = this._storedAddress || '10 Tôn Thất Tùng, Hà Nội';
                    document.getElementById('detail-booking-price').innerText = this.currentBooking.price.toLocaleString('vi-VN') + 'đ';

                    // AUTO POPUP DETAILS MODAL after success screen shows
                    setTimeout(() => {
                        this.openBookingDetailModal();
                    }, 2000);
                }, 1200);
            } else {
                // MoMo QR flow
                const bookingId = "JC-2026-" + Math.floor(1000 + Math.random() * 9000);
                const momoAmount = document.getElementById('momo-amount-display');
                if (momoAmount) momoAmount.innerText = this.currentBooking.price.toLocaleString('vi-VN') + 'đ';

                const momoName = document.getElementById('momo-service-name');
                if (momoName) momoName.innerText = this.currentBooking.title;
                const momoCode = document.getElementById('momo-service-code');
                if (momoCode) momoCode.innerText = bookingId;

                this.navigate('momo-qr');
                this.startMomoTimer();
            }
        }, 2000);
    },

    _momoTimerUrl: null,

    startMomoTimer: function () {
        let timeLeft = 900; // 15 minutes
        const timerEl = document.getElementById('momo-time-left');
        if (!timerEl) return;

        if (this._momoTimerUrl) clearInterval(this._momoTimerUrl);

        this._momoTimerUrl = setInterval(() => {
            if (timeLeft <= 0) {
                clearInterval(this._momoTimerUrl);
                alert("Mã QR đã hết hạn. Vui lòng thử thanh toán lại!");
                this.navigate('payment');
                return;
            }
            timeLeft--;
            const m = Math.floor(timeLeft / 60);
            const s = timeLeft % 60;
            timerEl.innerText = `Lệnh hết hạn sau: ${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }, 1000);
    },

    completeMomoPayment: function () {
        if (this._momoTimerUrl) clearInterval(this._momoTimerUrl);
        const btn = document.getElementById('momo-mock-btn');
        if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" style="margin-right:6px;"></i> Đang xử lý thanh toán...';
            btn.style.opacity = '0.8';
        }
        setTimeout(() => {
            if (btn) {
                btn.innerHTML = '<i class="fa-solid fa-check" style="margin-right:6px;"></i> Thanh toán thành công!';
                btn.style.background = 'linear-gradient(135deg, #34C759, #248A3D)';
                btn.style.opacity = '1';
                btn.style.boxShadow = '0 6px 16px rgba(52,199,89,0.3)';
            }

            setTimeout(() => {
                this.navigate('payment-success');
                this.triggerConfetti();

                // Set booking details for the modal
                const bookingId = "JC-2026-" + Math.floor(1000 + Math.random() * 9000);
                const idDisplay = document.getElementById('booking-id-display');
                if (idDisplay) idDisplay.innerText = bookingId;

                // Populate detailed modal
                document.getElementById('detail-booking-id').innerText = bookingId;
                document.getElementById('detail-service-name').innerText = this.currentBooking.title;
                document.getElementById('detail-booking-time').innerText = document.getElementById('confirm-time')?.innerText || '--:--, --/--/----';
                document.getElementById('detail-booking-address').innerText = this._storedAddress || '10 Tôn Thất Tùng, Hà Nội';
                document.getElementById('detail-booking-price').innerText = this.currentBooking.price.toLocaleString('vi-VN') + 'đ';

                // AUTO POPUP DETAILS MODAL after success screen shows
                setTimeout(() => {
                    this.openBookingDetailModal();
                }, 2000);
            }, 1000);
        }, 2000);
    },

    goToTracking: function () {
        this.closeBookingDetailModal();
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
        this.currentRating = stars;
        document.querySelectorAll('#rating-stars i').forEach((star, idx) => { star.style.color = idx < stars ? '#ffd700' : '#444'; });
    },

    toggleTag: function (tagEl) { tagEl.classList.toggle('selected'); },

    currentEmotion: null,

    selectEmotion: function (btn, emotion) {
        document.querySelectorAll('.emotion-btn').forEach(b => {
            b.style.borderColor = 'var(--border-color)';
            b.style.backgroundColor = 'var(--bg-dark)';
            b.querySelector('div:last-child').style.color = 'var(--text-primary)';
        });

        // Highlight logic
        const colors = {
            'Vui vẻ': 'rgba(52, 199, 89,',
            'Bình thường': 'rgba(0, 122, 255,',
            'Cô đơn': 'rgba(255, 149, 0,',
            'Mệt mỏi': 'rgba(255, 59, 48,'
        };
        const textColors = {
            'Vui vẻ': 'var(--success-green)',
            'Bình thường': 'var(--primary-blue)',
            'Cô đơn': 'var(--primary-orange)',
            'Mệt mỏi': 'var(--danger-red)'
        };

        btn.style.borderColor = textColors[emotion];
        btn.style.backgroundColor = colors[emotion] + ' 0.15)';
        btn.querySelector('div:last-child').style.color = textColors[emotion];

        this.currentEmotion = emotion;
    },

    saveDiary: function () {
        if (!this.currentEmotion) {
            alert('Vui lòng chọn trạng thái cảm xúc trước khi lưu!');
            return;
        }
        const note = document.getElementById('diary-note').value.trim();
        const historyContainer = document.getElementById('diary-history');

        const emoticons = {
            'Vui vẻ': '😊',
            'Bình thường': '😐',
            'Cô đơn': '😔',
            'Mệt mỏi': '😫'
        };

        let aiFeedback = '';
        if (this.currentEmotion === 'Cô đơn' || this.currentEmotion === 'Mệt mỏi') {
            aiFeedback = `<div style="color: var(--primary-orange); font-size: 10px; margin-top: 5px; background: rgba(255, 149, 0, 0.1); display: inline-block; padding: 4px 8px; border-radius: 8px; font-weight: 600;"><i class="fa-solid fa-robot"></i> AI khuyên: Nên đặt Joy-Home trò chuyện hoặc gọi điện hỏi thăm Bố.</div>`;
        } else {
            aiFeedback = `<div style="color: var(--success-green); font-size: 10px; margin-top: 5px; background: rgba(52, 199, 89, 0.1); display: inline-block; padding: 4px 8px; border-radius: 8px; font-weight: 600;"><i class="fa-solid fa-robot"></i> AI đánh giá: Trạng thái rất tốt, hãy tiếp tục duy trì nhé!</div>`;
        }

        const newEntry = `
            <div style="display: flex; align-items: flex-start; gap: 12px; padding: 12px 0; border-top: 1px solid var(--border-color);">
                <div style="font-size: 24px; background: var(--bg-dark); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">${emoticons[this.currentEmotion]}</div>
                <div>
                    <div style="font-size: 13px; font-weight: bold; color: var(--text-primary);">Vừa xong • ${this.currentEmotion}</div>
                    ${note ? `<div style="font-size: 12px; color: var(--text-secondary); margin-top: 3px;">${note}</div>` : ''}
                    ${aiFeedback}
                </div>
            </div>
        `;

        if (historyContainer) {
            historyContainer.insertAdjacentHTML('afterbegin', newEntry);
        }

        // Save to Firestore
        if (this.currentUser) {
            addDoc(collection(db, "diaries"), {
                userId: this.currentUser.uid,
                emotion: this.currentEmotion,
                note: note,
                createdAt: serverTimestamp()
            }).catch(err => console.error("Error saving diary:", err));
        }

        // Reset form
        this.currentEmotion = null;
        document.getElementById('diary-note').value = '';
        document.querySelectorAll('.emotion-btn').forEach(b => {
            b.style.borderColor = 'var(--border-color)';
            b.style.backgroundColor = 'var(--bg-dark)';
            b.querySelector('div:last-child').style.color = 'var(--text-primary)';
        });

    },

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

        // Auto-refund if rating is below 3 stars
        if (this.currentRating && this.currentRating < 3) {
            if (ratingModal) ratingModal.style.display = 'none';
            const feedbackModal = document.getElementById('feedback-modal');
            if (feedbackModal) feedbackModal.style.display = 'flex';
            return;
        }

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

        setTimeout(() => {
            this.navigate('thankyou');
        }, 300);
    },

    confirmFeedback: function () {
        const reasonInput = document.getElementById('feedback-reason-input');
        const reason = reasonInput ? reasonInput.value.trim() : "";
        if (!reason) {
            alert("Bạn cần nhập lý do xác minh để tiếp tục.");
            return;
        }

        const feedbackModal = document.getElementById('feedback-modal');
        if (feedbackModal) feedbackModal.style.display = 'none';

        const timeNow = new Date().toLocaleDateString('vi-VN');
        const historyHtml = `<div style="background:var(--bg-card);padding:15px;border-radius:12px;margin-bottom:10px;border:1px solid var(--border-color);">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
                <b style="color:white;font-size:15px;"><i class="fa-solid fa-house" style="color:var(--primary-orange);"></i> ${this.currentBooking.title}</b>
                <span style="color:var(--primary-orange);font-weight:bold;font-size:13px;">Tạm giữ</span>
            </div>
            <div style="font-size:13px;color:var(--text-secondary);margin-bottom:10px;">${timeNow} • JoyPal Tuấn</div>
            <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px dashed var(--border-color);padding-top:10px;">
                <b style="color:var(--primary-orange);font-size:16px;">${this.currentBooking.price.toLocaleString('vi-VN')}đ</b>
                <span style="color:#ffd700;font-size:13px;font-weight:bold;"><i class="fa-solid fa-star"></i> Đã đánh giá ${this.currentRating}*</span>
            </div></div>`;
        const profileHistory = document.getElementById('profile-history-list');
        if (profileHistory) profileHistory.innerHTML = historyHtml + profileHistory.innerHTML;
        const familyHistory = document.getElementById('family-history-list');
        if (familyHistory) {
            const placeholder = familyHistory.querySelector('div[style*="Chưa có lịch sử"]');
            if (placeholder) placeholder.remove();
            familyHistory.innerHTML = historyHtml + familyHistory.innerHTML;
        }

        // Add notification
        const notifList = document.getElementById('notif-list');
        if (notifList) {
            const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            const newNotif = document.createElement('div');
            newNotif.style.cssText = 'display:flex;gap:12px;padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.05);background:rgba(255,149,0,0.07);';
            newNotif.innerHTML = `
                <div style="width:42px;height:42px;background:linear-gradient(135deg,#FF9500,#e67e00);border-radius:12px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <i class="fa-solid fa-triangle-exclamation" style="color:white;font-size:18px;"></i>
                </div>
                <div style="flex:1;">
                    <div style="font-size:13px;font-weight:700;color:white;margin-bottom:3px;">⚠️ Giao dịch bị tạm giữ</div>
                    <div style="font-size:11px;color:#aaa;line-height:1.4;">Ca dịch vụ ${this.currentBooking.title} bị tạm giữ để xác minh đánh giá ${this.currentRating}*. CSKH sẽ liên hệ sớm.</div>
                </div>`;
            notifList.insertBefore(newNotif, notifList.firstChild);
        }
        const badge = document.getElementById('notif-badge');
        if (badge) { badge.style.display = 'flex'; badge.innerText = '1'; }

        setTimeout(() => {
            alert(`⚠️ HT đã ghi nhận đánh giá với lý do: "${reason}".\n\nSố tiền tạm giữ để bộ phận CSKH JoyCare xác minh. Chúng tôi sẽ liên hệ trong 15p tới.`);
            this.navigate('thankyou');
        }, 300);
    },

    toggleLike: function (btn, type) {
        if (type === 'heart') {
            if (btn.style.color === 'rgb(255, 45, 85)') {
                btn.style.color = 'var(--text-secondary)';
                btn.innerHTML = '<i class="fa-regular fa-heart" style="font-size: 16px;"></i> Thích';
            } else {
                btn.style.color = '#FF2D55';
                btn.innerHTML = '<i class="fa-solid fa-heart" style="font-size: 16px;"></i> Yêu thích';
            }
        } else if (type === 'thumb') {
            if (btn.style.color === 'rgb(0, 122, 255)') {
                btn.style.color = 'var(--text-secondary)';
                btn.innerHTML = '<i class="fa-regular fa-thumbs-up" style="font-size: 16px;"></i> Thích';
            } else {
                btn.style.color = '#007AFF';
                btn.innerHTML = '<i class="fa-solid fa-thumbs-up" style="font-size: 16px;"></i> Đã Thích';
            }
        }
    },

    initCommunitySync: function () {
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
        onSnapshot(q, (snapshot) => {
            const feedContainer = document.getElementById('community-feed-container');
            if (!feedContainer) return;

            // For MVP: Simple re-render of all posts
            feedContainer.innerHTML = '';
            snapshot.forEach((docSnap) => {
                const post = docSnap.data();
                this.renderPost(docSnap.id, post);
            });
        });
    },

    renderPost: function (id, post) {
        const feedContainer = document.getElementById('community-feed-container');
        const newPost = document.createElement('div');
        newPost.className = 'card mb-4';
        newPost.style.cssText = 'border-radius: 16px; border: 1px solid var(--border-color); padding: 0; overflow: hidden; background: var(--bg-card);';

        const timeStr = post.createdAt ? new Date(post.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Vừa xong';
        const uniqueId = 'comment-input-' + id;
        const containerId = 'comments-container-' + id;

        newPost.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 15px 15px 10px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <img src="${post.authorPhoto || 'https://i.pravatar.cc/150?img=5'}" style="width:40px; height:40px; border-radius:50%; border: 2px solid var(--primary-blue);">
                    <div>
                        <div style="font-size: 14px; font-weight: bold; color: var(--text-primary);">${post.authorName || 'Người dùng JoyCare'}</div>
                        <div style="font-size: 12px; color: var(--text-secondary);">${timeStr} • <i class="fa-solid fa-earth-asia"></i> Công khai</div>
                    </div>
                </div>
            </div>
            <div style="padding: 0 15px 12px; font-size: 14px; color: var(--text-primary); line-height: 1.5;">${post.text}</div>
            <div style="display: flex; justify-content: space-between; padding: 10px 15px; border-bottom: 1px solid var(--border-color); font-size: 13px; color: var(--text-secondary);">
                <div style="display: flex; align-items: center; gap: 5px;">
                    <div style="background: #FF2D55; color: white; border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; font-size: 10px;"><i class="fa-solid fa-heart"></i></div>
                    <span>${post.likes || 0}</span>
                </div>
                <div>${post.commentsCount || 0} Bình luận</div>
            </div>
            <div style="display: flex; padding: 5px 15px;">
                <button onclick="app.togglePostLike('${id}', ${post.likes || 0})" style="flex: 1; background: transparent; border: none; color: var(--text-secondary); font-size: 13px; font-weight: 600; padding: 8px 0; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <i class="fa-regular fa-heart" style="font-size: 16px;"></i> Thích
                </button>
                <button onclick="document.getElementById('${uniqueId}').focus()" style="flex: 1; background: transparent; border: none; color: var(--text-secondary); font-size: 13px; font-weight: 600; padding: 8px 0; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <i class="fa-regular fa-comment" style="font-size: 16px;"></i> Bình luận
                </button>
            </div>
            <div style="padding: 15px; background: rgba(0,0,0,0.1);">
                <div id="${containerId}"></div>
                <div style="display: flex; gap: 10px; align-items: center; margin-top: 5px;">
                    <img src="${this.currentUser ? (this.currentUser.photoURL || 'https://i.pravatar.cc/150?img=5') : 'https://i.pravatar.cc/150?img=5'}" style="width: 32px; height: 32px; border-radius: 50%;">
                    <div style="flex: 1; display: flex; align-items: center; background: var(--bg-dark); border-radius: 20px; padding: 6px 12px; border: 1px solid var(--border-color);">
                        <input id="${uniqueId}" type="text" placeholder="Thêm bình luận..." style="flex: 1; background: transparent; border: none; font-size: 13px; outline: none; color: var(--text-primary);" onkeydown="if(event.key==='Enter') app.submitPostComment('${id}', '${uniqueId}')">
                        <i class="fa-solid fa-paper-plane" style="color: var(--primary-blue); font-size: 16px; cursor: pointer;" onclick="app.submitPostComment('${id}', '${uniqueId}')"></i>
                    </div>
                </div>
            </div>
        `;
        feedContainer.appendChild(newPost);
    },

    submitPost: function () {
        const input = document.getElementById('new-post-content');
        if (!input) return;
        const content = input.value.trim();
        if (!content) return;

        const newPost = {
            id: 'post-' + Date.now(),
            authorId: 'user-my',
            authorName: 'Nguyễn Trần My',
            authorAvatar: 'https://i.pravatar.cc/150?img=5',
            authorRole: 'elder',
            time: 'Vừa xong',
            content: content,
            image: null,
            likes: 0,
            comments: 0,
            isLiked: false,
            tag: 'Mới'
        };

        this.communityPosts.unshift(newPost);
        input.value = '';
        this.renderCommunityFeed();
        this.showNotification("Cảm ơn bạn đã chia sẻ với cộng đồng!", "success");
    },

    togglePostLike: async function (postId, currentLikes) {
        try {
            await setDoc(doc(db, "posts", postId), {
                likes: currentLikes + 1
            }, { merge: true });
        } catch (e) {
            console.error("Error liking post: ", e);
        }
    },

    submitPostComment: async function (postId, inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;
        const text = input.value.trim();
        if (!text) return;

        try {
            // In a real app, we'd add to a subcollection. For MVP, we'll just update a count or ignore for now
            // To keep it simple, just clear input
            console.log("Comment submitted for", postId, ":", text);
            input.value = '';
            // Ideally: await addDoc(collection(db, "posts", postId, "comments"), { ... });
        } catch (e) {
            console.error("Error adding comment: ", e);
        }
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
            mapContainer.style.height = '50%';
            mapContainer.style.flex = 'none';
            mapContainer.style.maxHeight = 'none';
            timelineContainer.style.display = 'flex';
            timelineContainer.style.height = '50%';
            topBar.style.display = 'flex';
            screen.style.height = '100%';
            if (expandBtn) {
                expandBtn.innerHTML = '<i class="fa-solid fa-expand" style="color:#555;"></i>';
                expandBtn.title = 'Phóng to';
            }
        }
    },

    sendMessageToAI: function () {
        const input = document.getElementById('ai-chat-input');
        const container = document.getElementById('ai-chat-messages');
        if (!input || !input.value.trim() || !container) return;

        const userText = input.value.trim();
        input.value = '';

        // User message bubble (Messenger style)
        const userMsgHtml = `
            <div style="align-self: flex-end; max-width: 80%; background: #0084ff; border-radius: 18px 18px 4px 18px; padding: 10px 16px; box-shadow: 0 2px 10px rgba(0,132,255,0.25); margin-bottom: 4px;">
                <p style="font-size: 14px; color: white; margin: 0; line-height: 1.5; font-weight: 500;">${userText}</p>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', userMsgHtml);

        requestAnimationFrame(() => {
            container.scrollTop = container.scrollHeight;
        });

        this._aiResponse(userText);
    },

    _aiResponse: function (query) {
        const container = document.getElementById('ai-chat-messages');
        this.getAIResponse(query, container, 'joyai');
    },

    getAIResponse: async function (query, container, type = 'joyai') {
        const typingId = 'typing-' + Date.now();
        const typingHtml = `<div id="${typingId}" style="align-self: flex-start; background: var(--bg-card); padding: 10px 16px; border-radius: 18px; border: 1px solid var(--border-color); font-size: 12px; color: #aaa; margin-bottom: 4px;"><i class="fa-solid fa-circle-notch fa-spin"></i> JoyAI đang nghĩ...</div>`;
        container.insertAdjacentHTML('beforeend', typingHtml);
        container.scrollTop = container.scrollHeight;

        try {
            const response = await this._callGroq(query);

            const typingIndicator = document.getElementById(typingId);
            if (typingIndicator) typingIndicator.remove();

            let aiMsgHtml = '';
            if (type === 'joyai') {
                aiMsgHtml = `
                    <div style="align-self: flex-start; max-width: 85%; background: var(--bg-card); padding: 12px 16px; border-radius: 18px 18px 18px 4px; border: 1px solid var(--border-color); box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 4px;">
                        <p style="font-size: 14px; color: var(--text-primary); margin: 0; line-height: 1.6; white-space: pre-line;">${response}</p>
                    </div>
                `;
            } else {
                // Support style
                aiMsgHtml = `
                    <div style="display:flex;align-items:flex-end;gap:8px;margin-bottom:12px;">
                        <div style="width:28px;height:28px;background:var(--danger-red);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;"><i class="fa-solid fa-headset" style="color:white;font-size:10px;"></i></div>
                        <div style="background:var(--bg-card);padding:10px 14px;border-radius:18px;border-bottom-left-radius:4px;max-width:85%;font-size:13px;color:white;line-height:1.5; white-space: pre-line;">${response}</div>
                    </div>
                `;
            }
            container.insertAdjacentHTML('beforeend', aiMsgHtml);
            container.scrollTop = container.scrollHeight;
        } catch (e) {
            console.error("Groq AI API Error:", e);
            const typingIndicator = document.getElementById(typingId);
            if (typingIndicator) typingIndicator.innerHTML = `<span style="color:var(--danger-red); font-size:11px;">Con xin lỗi, con gặp chút lỗi kết nối ạ! (${e.message})</span>`;
        }
    },

    startRealTimeClock: function () {
        const timeElements = document.querySelectorAll('.status-left');
        const updateTime = () => {
            const now = new Date();
            let hours = now.getHours();
            let minutes = now.getMinutes();
            const ampm = hours >= 12 ? 'PM' : 'AM';

            // Format hour to stay in 24h cycle but display AM/PM as requested
            let displayHours = hours < 10 ? '0' + hours : hours;
            let displayMinutes = minutes < 10 ? '0' + minutes : minutes;

            timeElements.forEach(el => {
                el.innerText = `${displayHours}:${displayMinutes} ${ampm}`;
            });
        };
        updateTime();
        setInterval(updateTime, 1000);
    },

    showNotification: function (message, type = 'success') {
        let toast = document.getElementById('joycare-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'joycare-toast';
            // Styling exactly matching JoyCare premium feel
            toast.style.cssText = 'position: absolute; top: 60px; left: 50%; transform: translateX(-50%); background: var(--bg-card); color: var(--text-primary); padding: 12px 20px; border-radius: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); z-index: 9999; display: flex; align-items: center; justify-content: center; gap: 10px; font-weight: 600; font-size: 13px; opacity: 0; transition: opacity 0.3s; border: 1px solid var(--border-color); white-space: nowrap;';
            document.getElementById('app-container').appendChild(toast);
        }

        const iconColor = type === 'success' ? '#34C759' : '#007AFF';
        const iconClass = type === 'success' ? 'fa-circle-check' : 'fa-info-circle';

        toast.innerHTML = `<i class="fa-solid ${iconClass}" style="color: ${iconColor}; font-size: 16px;"></i> ${message}`;
        toast.style.display = 'flex';
        // Force reflow to ensure transition runs when switching display back to flex
        void toast.offsetWidth;
        toast.style.opacity = '1';

        // Hide after 3s
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => { toast.style.display = 'none'; }, 300);
        }, 3000);
    },

    openEmojiPicker: function () {
        const modal = document.getElementById('emoji-picker-modal');
        const content = document.getElementById('emoji-picker-content');
        if (content.children.length === 0) {
            this.renderEmojis();
        }
        modal.style.display = 'flex';
    },

    closeEmojiPicker: function () {
        document.getElementById('emoji-picker-modal').style.display = 'none';
    },

    insertEmoji: function (emoji) {
        const input = document.getElementById('new-post-content');
        if (input) {
            input.value += emoji;
            input.focus();
        }
        this.closeEmojiPicker();
    },

    renderEmojis: function () {
        const categories = [
            { name: "Mũi tên & Chỉ hướng", icons: ["⬅️", "⬆️", "➡️", "⬇️", "↖️", "↗️", "↘️", "↙️", "↔️", "↕️", "↩️", "↪️", "⤴️", "⤵️", "🔃", "🔄"] },
            { name: "🔥 Icon Hot/Nổi bật", icons: ["❤️", "😍", "🥰", "🤣", "😂", "🔥", "💖", "😊", "👍", "✨", "🌟", "✅", "👉", "✈️", "🥳", "🎉", "💥", "🍀"] },
            { name: "❤️ Icon Trái tim & Tình yêu", icons: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝"] },
            { name: "☀️ Icon Thời tiết & Thiên nhiên", icons: ["☀️", "🌤️", "⛅", "🌥️", "☁️", "🌦️", "🌧️", "⛈️", "🌩️", "⚡", "❄️", "☃️", "⛄", "🌬️", "💨", "💧", "💦", "☔"] },
            { name: "🍕 Icon Đồ ăn & Thức uống", icons: ["🍎", "🍕", "🍔", "🍟", "🌭", "🍿", "🍣", "🍤", "🍧", "🍦", "🍩", "🍪", "🎂", "🍰", "🍫", "🍬", "🍭", "☕", "🍵"] },
            { name: "💡 Icon Công cụ & Giáo dục", icons: ["💡", "📚", "📖", "🖊️", "🖋️", "✒️", "📝", "✏️", "✂️", "📌", "🔍", "🔎", "🔒", "🔓", "🔑", "🛠️", "⛏️", "⚒️", "🔨", "⚙️"] },
            { name: "✨ Ký tự đặc biệt/Icon trang trí", icons: ["★", "☆", "✦", "✧", "✡︎", "✪", "✫", "✬", "✭", "✮", "✯", "✰", "✅", "❌", "❎", "➕", "➖", "➗", "❗", "❓", "💯"] }
        ];

        const content = document.getElementById('emoji-picker-content');
        let html = '';
        categories.forEach(cat => {
            html += `<div style="margin-bottom: 20px;">
                        <div style="color: var(--text-secondary); font-size: 13px; font-weight: 600; margin-bottom: 10px;">${cat.name}</div>
                        <div style="display: flex; flex-wrap: wrap; gap: 12px;">`;
            cat.icons.forEach(emoji => {
                html += `<span onclick="app.insertEmoji('${emoji}')" style="font-size: 24px; cursor: pointer; display: inline-block; padding: 4px; border-radius: 8px; transition: background 0.2s;" onmouseover="this.style.background='var(--bg-dark)'" onmouseout="this.style.background='transparent'">${emoji}</span>`;
            });
            html += `</div></div>`;
        });
        content.innerHTML = html;
    },

    // Family Profile Wizard Logic
    selectFamilyTag: function (el, category) {
        // Handle selection within a group
        const parent = el.parentElement;
        if (category === 'relationship' || category === 'gender' || category === 'mobility') {
            // Single choice categories
            parent.querySelectorAll('.tag-choice').forEach(tag => {
                tag.classList.remove('selected');
                tag.style.background = 'var(--bg-dark)';
                tag.style.borderColor = 'var(--border-color)';
                tag.style.color = 'var(--text-secondary)';
                const icon = tag.querySelector('i');
                if (icon) icon.remove();
            });
            el.classList.add('selected');
            const primaryColor = category === 'mobility' ? 'var(--primary-orange)' : 'var(--primary-blue)';
            const bgColor = category === 'mobility' ? 'rgba(255,149,0,0.08)' : 'rgba(0,122,255,0.08)';
            el.style.background = bgColor;
            el.style.borderColor = primaryColor;
            el.style.color = primaryColor;
            if (category === 'mobility') {
                el.insertAdjacentHTML('beforeend', ' <i class="fa-solid fa-check-circle"></i>');
            }
        } else {
            // Multi-choice tags (handled differently if needed, here we just toggle visual)
            if (el.classList.contains('selected')) {
                el.classList.remove('selected');
                el.style.background = 'var(--bg-dark)';
                el.style.borderColor = 'var(--border-color)';
                el.style.color = 'var(--text-secondary)';
            } else {
                el.classList.add('selected');
                const accentColor = el.parentElement.parentElement.querySelector('h3') ? el.parentElement.parentElement.querySelector('h3').style.color : 'var(--primary-blue)';
                el.style.background = accentColor.replace('rgb', 'rgba').replace(')', ', 0.08)');
                el.style.borderColor = accentColor;
                el.style.color = accentColor;
            }
        }
    },

    nextFamilyStep: function (currentStep) {
        const nextStep = currentStep + 1;
        if (nextStep > 4) return;

        // Hide current, show next
        document.getElementById(`family-step-${currentStep}`).style.display = 'none';
        document.getElementById(`family-step-${nextStep}`).style.display = 'block';

        // Update progress UI
        const progressLine = document.getElementById('family-progress-line');
        if (progressLine) {
            progressLine.style.width = `${(nextStep - 1) * 33.33}%`;
        }

        // Update dots
        for (let i = 1; i <= 4; i++) {
            const dot = document.getElementById(`step-dot-${i}`);
            if (dot) {
                if (i <= nextStep) {
                    dot.style.background = 'var(--primary-blue)';
                    dot.style.color = 'white';
                    dot.style.borderColor = 'var(--primary-blue)';
                } else {
                    dot.style.background = 'var(--bg-card)';
                    dot.style.color = 'var(--text-secondary)';
                    dot.style.borderColor = 'var(--border-color)';
                }
            }
        }

        // Scroll top
        document.getElementById('screen-family-profile').scrollTop = 0;
    },

    prevFamilyStep: function (currentStep) {
        const prevStep = currentStep - 1;
        if (prevStep < 1) return;

        // Hide current, show previous
        document.getElementById(`family-step-${currentStep}`).style.display = 'none';
        document.getElementById(`family-step-${prevStep}`).style.display = 'block';

        // Update progress UI
        const progressLine = document.getElementById('family-progress-line');
        if (progressLine) {
            progressLine.style.width = `${(prevStep - 1) * 33.33}%`;
        }

        // Update dots
        for (let i = 1; i <= 4; i++) {
            const dot = document.getElementById(`step-dot-${i}`);
            if (dot) {
                if (i <= prevStep) {
                    dot.style.background = 'var(--primary-blue)';
                    dot.style.color = 'white';
                    dot.style.borderColor = 'var(--primary-blue)';
                } else {
                    dot.style.background = 'var(--bg-card)';
                    dot.style.color = 'var(--text-secondary)';
                    dot.style.borderColor = 'var(--border-color)';
                }
            }
        }
    },
    selectFamilyTag: function (element, type) {
        const multiSelect = ['disease', 'trait', 'hobby', 'jp-skill', 'jp-trait'].includes(type);

        if (!multiSelect) {
            const stepContainer = element.closest('.family-step');
            const group = stepContainer.querySelectorAll(`.tag-choice[onclick*="'${type}'"]`);
            group.forEach(tag => {
                tag.classList.remove('selected');
                tag.style.background = 'var(--bg-dark)';
                tag.style.borderColor = 'var(--border-color)';
                tag.style.color = 'var(--text-secondary)';
                const icon = tag.querySelector('.fa-check-circle');
                if (icon) icon.remove();
            });

            element.classList.add('selected');
            let color = 'var(--primary-blue)';
            let bg = 'rgba(0,122,255,0.08)';
            if (type === 'mobility' || type === 'disease') { color = 'var(--primary-orange)'; bg = 'rgba(255,149,0,0.08)'; }
            else if (type === 'trait' || type === 'hobby') { color = '#AF52DE'; bg = 'rgba(175,82,222,0.08)'; }
            else if (type.startsWith('jp-')) { color = 'var(--success-green)'; bg = 'rgba(52,199,89,0.08)'; }

            element.style.background = bg;
            element.style.borderColor = color;
            element.style.color = color;

            if (type === 'mobility' || type === 'jp-level') {
                element.innerHTML += ' <i class="fa-solid fa-check-circle" style="margin-left:5px;"></i>';
            }
        } else {
            const isSelected = element.classList.toggle('selected');
            let color = 'var(--primary-orange)';
            let bg = 'rgba(255,149,0,0.08)';
            if (type === 'trait' || type === 'hobby') { color = '#AF52DE'; bg = 'rgba(175,82,222,0.08)'; }
            else if (type.startsWith('jp-')) { color = 'var(--success-green)'; bg = 'rgba(52,199,89,0.08)'; }

            if (isSelected) {
                element.style.background = bg;
                element.style.borderColor = color;
                element.style.color = color;
            } else {
                element.style.background = 'var(--bg-dark)';
                element.style.borderColor = 'var(--border-color)';
                element.style.color = 'var(--text-secondary)';
            }
        }
    },

    saveFamilyProfile: function () {
        const profile = {
            name: document.querySelector('#family-step-1 input[type="text"]')?.value || 'Người thân',
            relationship: document.querySelector('#family-step-1 .tag-choice.selected')?.innerText || '',
            gender: document.querySelectorAll('#family-step-1 .tag-choice.selected')[1]?.innerText || '', // Second group is gender
            mobility: document.querySelector('#family-step-2 .tag-choice.selected')?.innerText || '',
            diseases: Array.from(document.querySelectorAll('#family-step-2 .tag-choice.selected:not([onclick*="mobility"])')).map(el => el.innerText),
            traits: Array.from(document.querySelectorAll('#family-step-3 .tag-choice.selected:not([onclick*="hobby"])')).map(el => el.innerText),
            hobbies: Array.from(document.querySelectorAll('#family-step-3 .tag-choice.selected[onclick*="hobby"]')).map(el => el.innerText),
            notes: document.getElementById('family-notes')?.value || '',
            requirements: {
                gender: document.querySelector('#family-step-4 .tag-choice.selected[onclick*="jp-gender"]')?.innerText || '',
                level: document.querySelector('#family-step-4 .tag-choice.selected[onclick*="jp-level"]')?.innerText || '',
                skills: Array.from(document.querySelectorAll('#family-step-4 .tag-choice.selected[onclick*="jp-skill"]')).map(el => el.innerText),
                traits: Array.from(document.querySelectorAll('#family-step-4 .tag-choice.selected[onclick*="jp-trait"]')).map(el => el.innerText)
            }
        };

        localStorage.setItem('joycare_family_profile', JSON.stringify(profile));
        this.showNotification("🎉 Hồ sơ người thân đã được lưu thành công!", "success");
        this.familyProfileComplete = true;
        localStorage.setItem('joycare_family_complete', 'true');

        setTimeout(() => {
            this.navigate('profile');
            this.resetFamilyWizard();
        }, 1500);
    },

    checkFamilyProfileStatus: function () {
        const isComplete = localStorage.getItem('joycare_family_complete') === 'true';
        const summary = document.getElementById('family-profile-summary');
        const header = document.getElementById('family-wizard-header');

        if (isComplete) {
            if (summary) summary.style.display = 'block';
            if (header) header.style.display = 'none';
            // Hide all wizard steps
            for (let i = 1; i <= 4; i++) {
                const step = document.getElementById(`family-step-${i}`);
                if (step) step.style.display = 'none';
            }
            this.renderFamilySummary();
        } else {
            if (summary) summary.style.display = 'none';
            if (header) header.style.display = 'block';
            this.resetFamilyWizard();
        }
    },

    renderFamilySummary: function () {
        const profileData = localStorage.getItem('joycare_family_profile');
        if (!profileData) return;
        const profile = JSON.parse(profileData);

        // Basic Info
        const nameEl = document.getElementById('sum-name');
        const relEl = document.getElementById('sum-rel');
        const genderEl = document.getElementById('sum-gender');
        const ageEl = document.getElementById('sum-age');

        if (nameEl) nameEl.innerText = profile.name;
        if (relEl) relEl.innerText = profile.relationship;
        if (genderEl) genderEl.innerText = profile.gender;
        if (ageEl) ageEl.innerText = profile.age || '82 tuổi';

        // Health
        const mobilityEl = document.getElementById('sum-mobility');
        if (mobilityEl) mobilityEl.innerText = profile.mobility;

        const diseasesEl = document.getElementById('sum-diseases');
        if (diseasesEl) {
            diseasesEl.innerHTML = profile.diseases.map(d => `<span class="tag" style="background:rgba(255,149,0,0.1); color:var(--primary-orange); border:1px solid rgba(255,149,0,0.2); font-size:11px;">${d}</span>`).join('');
        }

        const healthNotesEl = document.getElementById('sum-health-notes');
        if (healthNotesEl) healthNotesEl.innerText = profile.notes || 'Không có lưu ý đặc biệt.';

        // JP Requirements
        const jpGenderEl = document.getElementById('sum-jp-gender');
        const jpLevelEl = document.getElementById('sum-jp-level');
        const jpSkillsEl = document.getElementById('sum-jp-skills');

        if (jpGenderEl) jpGenderEl.innerText = profile.requirements.gender;
        if (jpLevelEl) jpLevelEl.innerText = profile.requirements.level;
        if (jpSkillsEl) {
            jpSkillsEl.innerHTML = profile.requirements.skills.map(s => `<span class="tag" style="background:rgba(52,199,89,0.1); color:var(--success-green); border:1px solid rgba(52,199,89,0.2); font-size:11px;">${s}</span>`).join('');
        }
    },

    editFamilyProfile: function () {
        if (confirm("Bạn muốn chỉnh sửa hồ sơ người thân?")) {
            localStorage.setItem('joycare_family_complete', 'false');
            this.checkFamilyProfileStatus();
            this.showNotification("Chế độ chỉnh sửa đã sẵn sàng", "info");
        }
    },

    resetFamilyWizard: function () {
        // Show step 1 and reset UI state if needed
        for (let i = 1; i <= 4; i++) {
            const step = document.getElementById(`family-step-${i}`);
            if (step) step.style.display = i === 1 ? 'block' : 'none';

            const dot = document.getElementById(`step-dot-${i}`);
            if (dot) {
                if (i === 1) {
                    dot.style.background = 'var(--primary-blue)';
                    dot.style.color = 'white';
                    dot.style.borderColor = 'var(--primary-blue)';
                } else {
                    dot.style.background = 'var(--bg-card)';
                    dot.style.color = 'var(--text-secondary)';
                    dot.style.borderColor = 'var(--border-color)';
                }
            }
        }
        const progressLine = document.getElementById('family-progress-line');
        if (progressLine) progressLine.style.width = '0%';
    },

    // --- Modal Logic ---
    openAboutJoyCare: function () {
        const modal = document.getElementById('about-joycare-modal');
        if (modal) {
            modal.style.display = 'flex';
            modal.classList.add('active');
        }
    },
    closeAboutJoyCare: function () {
        const modal = document.getElementById('about-joycare-modal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
        }
    },

    openJoyPalDetail: function (id) {
        const jp = this.joyPals.find(p => p.id === id);
        if (!jp) return;

        const modal = document.getElementById('joypal-detail-modal');
        if (!modal) return;

        // Populate Header
        document.getElementById('jp-detail-avatar').src = jp.avatar;
        document.getElementById('jp-detail-name').innerText = jp.name;
        document.getElementById('jp-detail-age').innerText = `${jp.age} tuổi`;
        document.getElementById('jp-detail-rating').innerText = jp.rating;
        document.getElementById('jp-detail-reviews').innerText = `${jp.reviews_count} lượt`;
        document.getElementById('jp-detail-hours').innerText = jp.hours;

        // Populate Education
        document.getElementById('jp-detail-uni').innerText = jp.university;
        document.getElementById('jp-detail-major').innerText = jp.major;
        document.getElementById('jp-detail-year').innerText = jp.year;

        // Populate Bio
        document.getElementById('jp-detail-bio').innerText = jp.bio;

        // Populate Skills
        const skillsContainer = document.getElementById('jp-detail-skills');
        if (skillsContainer) {
            let html = '';
            // Combined skills into clean chips
            const allSkills = [...jp.skills.medical, ...jp.skills.care, ...jp.skills.personality];
            allSkills.forEach(skill => {
                html += `<span class="tag" style="background: rgba(255,149,0,0.1); color: var(--primary-orange); border: 1px solid rgba(255,149,0,0.2); padding: 5px 12px; border-radius: 20px; font-size: 11px; font-weight: 700;">${skill}</span>`;
            });
            skillsContainer.innerHTML = html;
        }

        // Populate Reviews
        const reviewsContainer = document.getElementById('jp-detail-reviews-list');
        if (reviewsContainer) {
            reviewsContainer.innerHTML = jp.top_reviews.map(r => `
                <div class="card" style="padding: 15px; margin-bottom: 12px; border: 1px solid var(--border-color); background: rgba(255,255,255,0.03);">
                    <div style="font-size: 13px; line-height: 1.5; color: var(--text-primary); margin-bottom: 8px; font-style: italic;">"${r.content}"</div>
                    <div style="font-size: 11px; font-weight: 700; color: var(--primary-blue); text-align: right;">- ${r.author}</div>
                </div>
            `).join('');
        }

        // [PHASE 3] Populate Recent Posts
        const recentPostsContainer = document.getElementById('jp-detail-posts');
        if (recentPostsContainer) {
            const jpPosts = this.communityPosts.filter(p => p.authorId === id);
            if (jpPosts.length > 0) {
                recentPostsContainer.innerHTML = jpPosts.map(p => `
                    <div class="card mb-3" style="padding: 12px; background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 14px;">
                        <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 5px;">${p.time}</div>
                        <div style="font-size: 13px; color: var(--text-primary); line-height: 1.4;">${p.content}</div>
                        <div style="margin-top: 8px; display: flex; gap: 15px; font-size: 11px; color: var(--text-secondary);">
                            <span><i class="fa-regular fa-heart"></i> ${p.likes}</span>
                            <span><i class="fa-regular fa-comment"></i> ${p.comments}</span>
                        </div>
                    </div>
                `).join('');
            } else {
                recentPostsContainer.innerHTML = '<div style="font-size: 13px; opacity: 0.5; text-align: center; padding: 20px;">Chưa có bài viết nào</div>';
            }
        }

        modal.style.display = 'flex';
        modal.classList.add('active');
    },

    closeJoyPalDetail: function () {
        const modal = document.getElementById('joypal-detail-modal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
        }
    },

    openJoyPalList: function () {
        const modal = document.getElementById('joypal-list-modal');
        if (modal) {
            this.renderJoyPalList();
            modal.style.display = 'flex';
            modal.classList.add('active');
        }
    },

    closeJoyPalList: function () {
        const modal = document.getElementById('joypal-list-modal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
        }
    },

    renderJoyPalList: function () {
        const container = document.getElementById('joypal-list-container');
        if (!container) return;

        container.innerHTML = this.joyPals.map(jp => `
            <div class="joypal-list-item card-glass" onclick="app.openJoyPalDetail('${jp.id}')" style="display:flex; align-items:center; padding:12px; gap:12px; margin-bottom:8px; border:1px solid var(--border-color);">
                <div style="position:relative;">
                    <img src="${jp.avatar}" style="width:50px; height:50px; border-radius:50%; border:2px solid var(--primary-blue);">
                    <div style="position:absolute; bottom:2px; right:2px; width:10px; height:10px; background:var(--success-green); border-radius:50%; border:2px solid var(--bg-card);"></div>
                </div>
                <div style="flex:1;">
                    <div style="display:flex; align-items:center; justify-content:space-between;">
                        <span style="font-weight:800; font-size:14px;">${jp.name}, ${jp.age}</span>
                        <div style="color:#ffd700; font-size:12px;"><i class="fa-solid fa-star"></i> ${jp.rating}</div>
                    </div>
                    <div style="font-size:12px; color:var(--text-secondary); margin-top:2px;">${jp.university}</div>
                    <div style="display:flex; gap:6px; margin-top:6px;">
                        <span style="font-size:10px; padding:2px 6px; background:rgba(52,199,89,0.1); color:var(--success-green); border-radius:4px;">VNeID 🛡️</span>
                        <span style="font-size:10px; padding:2px 6px; background:rgba(43,94,226,0.1); color:var(--primary-blue); border-radius:4px;">Thẻ Sinh Viên 🎓</span>
                    </div>
                </div>
                <i class="fa-solid fa-chevron-right" style="color:var(--text-secondary); font-size:12px;"></i>
            </div>
        `).join('');
    },

    // Community Social Functions
    _communityFilter: 'Tất cả',
    _communitySearch: '',

    renderCommunityFeed: function () {
        // Render Stories (Joy-Moments)
        const momentsContainer = document.getElementById('community-moments-list');
        if (momentsContainer) {
            momentsContainer.innerHTML = this.communityStories.map(s => `
                <div class="moment-item ${s.seen ? 'seen' : ''}" onclick="app.viewStory('${s.id}')">
                    <div class="moment-ring">
                        <img src="${s.avatar}">
                    </div>
                    <span>${s.name.split(' ')[0]}</span>
                </div>
            `).join('');
        }

        // Render Events
        const eventsContainer = document.getElementById('community-events-list');
        if (eventsContainer) {
            eventsContainer.innerHTML = this.communityEvents.map(e => `
                <div class="event-mini-card" style="background-image: url('${e.img}')">
                    <div class="event-overlay">
                        <div class="event-time">${e.time}</div>
                        <div class="event-title">${e.title}</div>
                    </div>
                </div>
            `).join('');
        }

        // [PHASE 2] Render Top JoyPals
        const palsContainer = document.getElementById('top-joypals-list');
        if (palsContainer) {
            palsContainer.innerHTML = this.topJoyPals.map(p => `
                <div class="top-pal-card" onclick="app.openJoyPalDetail('${p.id || 'jp-my'}')">
                    <img src="${p.avatar}" class="pal-mini-avatar">
                    <div class="pal-mini-name">${p.name}</div>
                    <div class="pal-mini-rating"><i class="fa-solid fa-star"></i> ${p.rating}</div>
                </div>
            `).join('');
        }

        // [PHASE 2] Render Daily Tip
        const tipContainer = document.getElementById('daily-tip-container');
        if (tipContainer) {
            const tip = this.communityTips[0]; // Logic for rotating can be added
            tipContainer.innerHTML = `
                <div class="tip-card-inner tip-${tip.color}">
                    <div class="tip-content">
                        <div class="tip-title"><i class="fa-solid ${tip.icon}"></i> ${tip.title}</div>
                        <div class="tip-text">${tip.content}</div>
                    </div>
                    <i class="fa-solid fa-chevron-right tip-arrow"></i>
                </div>
            `;
        }

        const container = document.getElementById('community-feed-container');
        if (!container) return;

        // Filter and Search logic
        let posts = this.communityPosts;
        if (this._communityFilter === 'Nổi bật') {
            posts = posts.filter(p => p.likes > 50);
        } else if (this._communityFilter === 'JoyPal') {
            posts = posts.filter(p => p.authorRole === 'joypal');
        } else if (this._communityFilter !== 'Tất cả') {
            posts = posts.filter(p => p.tag === this._communityFilter);
        }

        if (this._communitySearch) {
            const q = this._communitySearch.toLowerCase();
            posts = posts.filter(p =>
                p.content.toLowerCase().includes(q) ||
                p.authorName.toLowerCase().includes(q)
            );
        }

        if (posts.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; opacity: 0.5;">
                    <i class="fa-solid fa-magnifying-glass" style="font-size: 40px; margin-bottom: 10px;"></i>
                    <p>Không tìm thấy bài viết phù hợp</p>
                </div>
            `;
            return;
        }

        container.innerHTML = posts.map(post => `
            <div class="card mb-4 community-post-card" style="animation: fadeIn 0.4s ease;">
                <!-- Post Header -->
                <div class="post-header-new">
                    <div class="post-author-info" onclick="app.openJoyPalDetail('${post.authorId || 'jp-my'}')">
                        <div class="author-avatar-wrapper">
                            <img src="${post.authorAvatar}" class="author-avatar">
                            ${post.authorRole === 'joypal' ? '<div class="author-badge"><i class="fa-solid fa-shield-heart"></i></div>' : ''}
                        </div>
                        <div>
                            <div class="author-name">${post.authorName}</div>
                            <div class="post-meta">${post.time} • <i class="fa-solid fa-earth-asia"></i></div>
                        </div>
                    </div>
                    <div class="post-tag-badge">${post.tag}</div>
                </div>
                <!-- Post Content -->
                <div class="post-content-new">
                    <div class="content-text">${post.content}</div>
                </div>
                <!-- Post Image -->
                ${post.image ? `<div class="post-image-wrapper"><img src="${post.image}" class="post-image"></div>` : ''}
                <!-- Post Footer (Interactions) -->
                <div class="post-footer-new">
                    <div class="interaction-group">
                        <button onclick="app.toggleLike('${post.id}')" class="interaction-btn ${post.isLiked ? 'liked' : ''}">
                            <i class="${post.isLiked ? 'fa-solid' : 'fa-regular'} fa-heart"></i> 
                            <span>${post.likes}</span>
                        </button>
                        <button class="interaction-btn">
                            <i class="fa-regular fa-comment"></i> 
                            <span>${post.comments}</span>
                        </button>
                    </div>
                    <button class="interaction-btn" onclick="app.sharePost('${post.id}')">
                        <i class="fa-regular fa-share-from-square"></i> 
                        <span>Chia sẻ</span>
                    </button>
                </div>
            </div>
        `).join('');
    },

    setCommunityFilter: function (tag) {
        this._communityFilter = tag;
        document.querySelectorAll('.community-filter-chip').forEach(c => {
            if (c.innerText === tag) c.classList.add('active');
            else c.classList.remove('active');
        });
        this.renderCommunityFeed();
    },

    searchCommunity: function (query) {
        this._communitySearch = query;
        this.renderCommunityFeed();
    },

    viewStory: function (id) {
        const story = this.communityStories.find(s => s.id === id);
        if (story) {
            story.seen = true;
            this.showNotification(`Đang xem kỷ niệm của ${story.name}...`, "info");
            this.renderCommunityFeed();
        }
    },

    sharePost: function (id) {
        this.showNotification("Đã sao chép liên kết bài viết!", "success");
    },

    openLeaderboard: function () {
        const modal = document.getElementById('leaderboard-modal');
        const list = document.getElementById('leaderboard-list');
        if (modal && list) {
            list.innerHTML = this.communityLeaderboard.map(u => `
                <div class="leaderboard-item">
                    <div class="rank-badge rank-${u.rank}">${u.rank}</div>
                    <img src="${u.avatar}" class="user-avatar">
                    <div class="user-info">
                        <div class="user-name">${u.name}</div>
                        <div class="user-points">${u.points} Joy-Points</div>
                    </div>
                    ${u.rank === 1 ? '<i class="fa-solid fa-crown text-orange"></i>' : ''}
                </div>
            `).join('');
            modal.style.display = 'flex';
        }
    },

    closeLeaderboard: function () {
        const modal = document.getElementById('leaderboard-modal');
        if (modal) modal.style.display = 'none';
    },

    _isRecording: false,
    toggleVoiceRecord: function () {
        this._isRecording = !this._isRecording;
        if (this._isRecording) {
            this.showNotification("Đang ghi âm... Thả ra để hoàn tất", "info");
            document.getElementById('voice-rec-icon').style.color = '#FF3B30';
            document.getElementById('voice-rec-icon').classList.add('pulse');
        } else {
            this.showNotification("Đã nhận diện giọng nói: 'Hôm nay trời đẹp quá!'", "success");
            document.getElementById('new-post-content').value = "Hôm nay trời đẹp quá!";
            document.getElementById('voice-rec-icon').style.color = 'var(--primary-blue)';
            document.getElementById('voice-rec-icon').classList.remove('pulse');
        }
    },

    toggleLike: function (postId) {
        const post = this.communityPosts.find(p => p.id === postId);
        if (post) {
            post.isLiked = !post.isLiked;
            post.likes += post.isLiked ? 1 : -1;
            this.renderCommunityFeed();
        }
    },

    openClubDetail: function (clubId) {
        const club = this.clubs[clubId];
        if (!club) return;

        const modal = document.getElementById('club-detail-modal');
        document.getElementById('club-header-bg').style.backgroundImage = `url('${club.bg}')`;
        document.getElementById('club-name-title').innerText = club.name;
        document.getElementById('club-member-count').innerText = `${club.memberCount} Thành viên • ${Math.floor(Math.random() * 20) + 5} online`;

        const activitiesContainer = document.getElementById('club-activities-container');
        activitiesContainer.innerHTML = club.activities.map(act => `
            <div style="border-radius: 12px; overflow: hidden; background: rgba(255,255,255,0.03); border: 1px solid var(--border-color);">
                <img src="${act.img}" style="width: 100%; height: 100px; object-fit: cover;">
                <div style="padding: 8px; font-size: 12px; font-weight: 600; color: var(--text-primary); text-align: center;">${act.title}</div>
            </div>
        `).join('');

        const clubPostsContainer = document.getElementById('club-posts-container');
        clubPostsContainer.innerHTML = `
            <div class="card" style="padding: 15px; border-radius: 16px; background: rgba(30,30,30,0.5); border: 1px solid var(--border-color);">
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
                    <img src="https://i.pravatar.cc/150?img=15" style="width:32px; height:32px; border-radius:50%;">
                    <div style="font-size:13px; font-weight:700;">Hùng Phạm <span style="font-weight:400; font-size:11px; opacity:0.6;">vừa đăng</span></div>
                </div>
                <div style="font-size:13px; line-height:1.4; color: var(--text-secondary);">Giao lưu ${club.name} tối nay 7h nhé các bác. Ai rảnh vào bàn 1 giao lưu nha!</div>
            </div>
        `;

        modal.style.display = 'flex';
        modal.classList.add('active');
    },

    closeClubDetail: function () {
        const modal = document.getElementById('club-detail-modal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
        }
    },

    joinClub: function () {
        alert('Chúc mừng! Bạn đã tham gia câu lạc bộ thành công. Hãy bắt đầu trò chuyện cùng các thành viên khác nhé!');
    },

    // ================= TRUST ARCHITECTURE & VETTING =================

    simulateVNeIDScan: function () {
        this.showNotification("Đang kết nối hệ thống định danh Bộ Công An...", "info");
        setTimeout(() => {
            this.showNotification("Xác thực VNeID Mức độ 2 thành công!", "success");
            this.joypalState.vetting.layer1 = true;
            this.updateVettingUI();

            // Move to Layer 2
            const step2 = document.getElementById('step-2');
            if (step2) step2.classList.add('active');

            const content = document.getElementById('registration-content');
            content.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <div style="font-size: 50px; margin-bottom: 20px;">🧠</div>
                    <h3 style="font-size: 20px; font-weight: 800;">Lớp 2: Bài test Joy-EQ</h3>
                    <p style="color: var(--text-secondary); font-size: 14px; margin-bottom: 30px;">
                        Bài kiểm tra 30 câu hỏi để đánh giá mức độ thấu cảm, kiên nhẫn và kỹ năng xử lý tình huống với người cao tuổi.
                    </p>
                    <button class="btn-primary" style="background: var(--joypal-accent);" onclick="app.startEQTest()">Bắt đầu làm bài (15 phút)</button>
                </div>
            `;
        }, 3000);
    },

    eqQuestions: [
        { q: "Nếu một cụ già lặp đi lặp lại một câu chuyện 5 lần trong 1 giờ, bạn sẽ làm gì?", a: ["Ngắt lời và bảo cụ đã kể rồi", "Lắng nghe như lần đầu và mỉm cười", "Tỏ ra khó chịu để cụ không kể nữa", "Lờ đi và làm việc khác"] },
        { q: "Bạn phát hiện cụ quên uống thuốc và cụ bảo 'không sao đâu', bạn xử lý thế nào?", a: ["Bỏ qua vì lời cụ là trên hết", "Giải thích nhẹ nhàng tầm quan trọng và khuyên cụ uống", "Ép cụ uống bằng mọi giá", "Gọi điện mắng người nhà cụ"] },
        { q: "Một cụ già tỏ ra gắt gỏng do đau nhức cơ thể, phản ứng của bạn là gì?", a: ["Mắng lại cụ", "Giữ im lặng và bỏ về", "Thấu hiểu nỗi đau của cụ và an ủi nhẹ nhàng", "Yêu cầu cụ phải lịch sự"] },
        { q: "Kỹ năng quan trọng nhất khi làm việc với người cao tuổi là gì?", a: ["Tốc độ làm việc", "Kỹ thuật y tế chuyên sâu", "Sự kiên nhẫn và lòng trắc ẩn", "Sức mạnh thể chất"] },
        { q: "Bạn sẽ làm gì nếu cụ già muốn đi dạo nhưng trời có dấu hiệu sắp mưa?", a: ["Vẫn đi vì cụ muốn", "Từ chối thẳng thừng", "Gợi ý cụ xem ảnh hoặc nghe nhạc trong nhà và đi dạo khi trời đẹp", "Để kệ cụ chọn"] },
        // ... (Adding more items would follow the same pattern, simulating a 30-question logic)
        { q: "Bạn thấy cụ buồn bã vì con cái không tới thăm, bạn nên nói gì?", a: ["Nói xấu con cụ", "Bảo cụ hãy quên họ đi", "Lắng nghe cụ tâm sự và chia sẻ những câu chuyện vui", "Nói rằng đó là chuyện bình thường"] }
    ],

    currentEqIndex: 0,

    startEQTest: function () {
        this.navigate('joypal-eq-test');
        this.currentEqIndex = 0;
        this.joypalState.eqAnswers = [];
        this.renderNextEQQuestion();
    },

    renderNextEQQuestion: function () {
        const question = this.eqQuestions[this.currentEqIndex];
        const container = document.getElementById('eq-options-container');
        const questionText = document.getElementById('eq-current-question');
        const progressFill = document.getElementById('eq-progress-fill');

        if (!question || this.currentEqIndex >= 5) { // Simplified to 5/30 for demo clarity
            this.finishEQTest();
            return;
        }

        questionText.innerText = `Câu ${this.currentEqIndex + 1}: ${question.q}`;
        progressFill.style.width = `${((this.currentEqIndex / 5) * 100)}%`;

        container.innerHTML = question.a.map((ans, idx) => `
            <div class="eq-option" onclick="app.submitEQAnswer(${idx})">${ans}</div>
        `).join('');
    },

    submitEQAnswer: function (index) {
        this.joypalState.eqAnswers.push(index);
        this.currentEqIndex++;

        // Brief delay for transition feel
        const options = document.querySelectorAll('.eq-option');
        options[index].classList.add('selected');

        setTimeout(() => {
            this.renderNextEQQuestion();
        }, 400);
    },

    finishEQTest: function () {
        this.joypalState.vetting.layer2 = true;
        this.showNotification("Hoàn thành bài test Joy-EQ! Điểm số: 28/30 (ĐẠT)", "success");
        this.updateVettingUI();

        this.navigate('joypal-home');
        this.showNotification("Hồ sơ của bạn đã được gửi tới hội đồng phỏng vấn (Lớp 3).", "info");
    },

    updateVettingUI: function () {
        const vetting = this.joypalState.vetting;
        let completedCount = 0;
        if (vetting.layer1) completedCount++;
        if (vetting.layer2) completedCount++;
        if (vetting.layer3) completedCount++;
        if (vetting.layer4) completedCount++;

        const percent = Math.round((completedCount / 4) * 100);
        const percentEl = document.getElementById('vetting-percent');
        const fillEl = document.getElementById('vetting-progress-fill');

        if (percentEl) percentEl.innerText = `${percent}%`;
        if (fillEl) fillEl.style.width = `${percent}%`;
    },

    // --- Celebration & Post-Payment Detail ---
    triggerConfetti: function () {
        const canvas = document.getElementById('confetti-canvas');
        if (!canvas) return;
        canvas.style.display = 'block';
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        let particles = [];
        const colors = ['#e63946', '#2b5ee2', '#34c759', '#ff9500', '#af52de', '#ffcc00'];

        for (let i = 0; i < 150; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height - canvas.height,
                size: Math.random() * 8 + 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                velocity: { x: (Math.random() - 0.5) * 10, y: Math.random() * 5 + 5 },
                rotation: Math.random() * 360,
                rotationSpeed: Math.random() * 10 - 5
            });
        }

        function render() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach((p, i) => {
                p.x += p.velocity.x;
                p.y += p.velocity.y;
                p.rotation += p.rotationSpeed;

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation * Math.PI / 180);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
                ctx.restore();

                if (p.y > canvas.height) {
                    particles.splice(i, 1);
                }
            });

            if (particles.length > 0) {
                requestAnimationFrame(render);
            } else {
                canvas.style.display = 'none';
            }
        }
        render();
    },

    openBookingDetailModal: function () {
        const modal = document.getElementById('booking-detail-modal');
        if (modal) {
            modal.style.display = 'flex';
            setTimeout(() => { modal.querySelector('.modal-content').style.transform = 'translateY(0)'; }, 10);
        }
    },

    closeBookingDetailModal: function () {
        const modal = document.getElementById('booking-detail-modal');
        if (modal) {
            modal.style.display = 'none';
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
    app.startRealTimeClock();
    app.updateWalletUI();
    app.initAuth();
    // Request notification permission after 2 seconds (non-disruptive)
    setTimeout(() => {
        app.requestNotificationPermission().then(() => {
            app.setupMedicineReminders();
        });
    }, 2000);

    // Make JoyAI bubble draggable
    const bubble = document.getElementById('joyai-bubble');
    if (bubble) {
        let isDragging = false;
        let didDrag = false;
        let startX, startY, initialX, initialY;

        bubble.addEventListener('mousedown', dragStart);
        bubble.addEventListener('touchstart', dragStart, { passive: false });

        function dragStart(e) {
            const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
            const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;

            startX = clientX;
            startY = clientY;

            initialX = bubble.offsetLeft;
            initialY = bubble.offsetTop;

            isDragging = true;
            didDrag = false;

            bubble.style.transition = 'none';

            document.addEventListener('mousemove', drag, { passive: false });
            document.addEventListener('touchmove', drag, { passive: false });
            document.addEventListener('mouseup', dragEnd);
            document.addEventListener('touchend', dragEnd);
        }

        function drag(e) {
            if (!isDragging) return;
            e.preventDefault();
            const clientX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
            const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;

            const dx = clientX - startX;
            const dy = clientY - startY;

            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                didDrag = true;
            }

            bubble.style.bottom = 'auto';
            bubble.style.right = 'auto';
            bubble.style.left = `${initialX + dx}px`;
            bubble.style.top = `${initialY + dy}px`;
        }

        function dragEnd() {
            if (!isDragging) return;
            isDragging = false;
            bubble.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

            document.removeEventListener('mousemove', drag);
            document.removeEventListener('touchmove', drag);
            document.removeEventListener('mouseup', dragEnd);
            document.removeEventListener('touchend', dragEnd);
        }

        bubble.addEventListener('click', function (e) {
            if (didDrag) {
                e.preventDefault();
                e.stopPropagation();
            } else {
                app.navigate('ai-chat');
            }
        });
    }

    // Expose app globally so HTML onclick handlers work
    window.app = app;
});
