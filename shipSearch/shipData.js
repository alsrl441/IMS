/**
 * 선박 데이터베이스
 * 
 * 구조 설명:
 * - name, tonnage, type, number, tel: 선박의 고유 정보 (변하지 않는 값)
 * - tags: 검색 시 활용할 키워드 (선체 색상, 특징 등)
 * - history: 식별될 때마다 추가되는 정보 (배열 형식)
 */

const shipData = [
    {
        name: "선박 1",
        tonnage: "2t",
        type: "어선",
        number: "경기 제12345호",
        tel: "010-1234-5678",
        tags: ["흰색 선체", "초록색 천막", "낚시 도구", "선외기", "흰색 선체", "초록색 천막", "낚시 도구", "선외기", "흰색 선체", "초록색 천막", "낚시 도구", "선외기", "흰색 선체", "초록색 천막", "낚시 도구", "선외기", "흰색 선체", "초록색 천막", "낚시 도구", "선외기", "흰색 선체", "초록색 천막", "낚시 도구", "선외기", "흰색 선체", "초록색 천막", "낚시 도구", "선외기", "흰색 선체", "초록색 천막", "낚시 도구", "선외기","흰색 선체", "초록색 천막", "낚시 도구", "선외기","흰색 선체", "초록색 천막", "낚시 도구", "선외기"],
        history: [
            {
                date: "2026-03-20",
                shipImage: "images/ship1_260320.jpg",
                pathImage: "images/path1_260320.jpg",
                firstTime: "08:30",
                firstPos: "인천대교 하단",
                lastTime: "17:45",
                lastPos: "소래포구 입구",
                crewCount: 3,
                handover: "특이사항 없음, 낚시 활동 중"
            },
            {
                date: "2026-03-14",
                shipImage: "images/ship1_260314.jpg",
                pathImage: "images/path1_260314.jpg",
                firstTime: "09:15",
                firstPos: "영종도 남단",
                lastTime: "16:20",
                lastPos: "인천항 부근",
                crewCount: 2,
                handover: "야간 조업 준비 중으로 보임"
            },
            {
                date: "2026-03-20",
                shipImage: "images/ship1_260320.jpg",
                pathImage: "images/path1_260320.jpg",
                firstTime: "08:30",
                firstPos: "인천대교 하단",
                lastTime: "17:45",
                lastPos: "소래포구 입구",
                crewCount: 3,
                handover: "특이사항 없음, 낚시 활동 중"
            },
            {
                date: "2026-03-14",
                shipImage: "images/ship1_260314.jpg",
                pathImage: "images/path1_260314.jpg",
                firstTime: "09:15",
                firstPos: "영종도 남단",
                lastTime: "16:20",
                lastPos: "인천항 부근",
                crewCount: 2,
                handover: "야간 조업 준비 중으로 보임"
            },
            {
                date: "2026-03-20",
                shipImage: "images/ship1_260320.jpg",
                pathImage: "images/path1_260320.jpg",
                firstTime: "08:30",
                firstPos: "인천대교 하단",
                lastTime: "17:45",
                lastPos: "소래포구 입구",
                crewCount: 3,
                handover: "특이사항 없음, 낚시 활동 중"
            },
            {
                date: "2026-03-14",
                shipImage: "images/ship1_260314.jpg",
                pathImage: "images/path1_260314.jpg",
                firstTime: "09:15",
                firstPos: "영종도 남단",
                lastTime: "16:20",
                lastPos: "인천항 부근",
                crewCount: 2,
                handover: "야간 조업 준비 중으로 보임"
            },
            {
                date: "2026-03-14",
                shipImage: "images/ship1_260314.jpg",
                pathImage: "images/path1_260314.jpg",
                firstTime: "09:15",
                firstPos: "영종도 남단",
                lastTime: "16:20",
                lastPos: "인천항 부근",
                crewCount: 2,
                handover: "야간 조업 준비 중으로 보임"
            },
            {
                date: "2026-03-14",
                shipImage: "images/ship1_260314.jpg",
                pathImage: "images/path1_260314.jpg",
                firstTime: "09:15",
                firstPos: "영종도 남단",
                lastTime: "16:20",
                lastPos: "인천항 부근",
                crewCount: 2,
                handover: "야간 조업 준비 중으로 보임"
            },
            {
                date: "2026-03-14",
                shipImage: "images/ship1_260314.jpg",
                pathImage: "images/path1_260314.jpg",
                firstTime: "09:15",
                firstPos: "영종도 남단",
                lastTime: "16:20",
                lastPos: "인천항 부근",
                crewCount: 2,
                handover: "야간 조업 준비 중으로 보임"
            }
        ]
    },
    {
        name: "선박 2",
        tonnage: "1.5t",
        type: "레저보트",
        number: "인천-레저-9988",
        tel: "010-9988-7766",
        tags: ["파란색 스트라이프", "빠름", "소형"],
        history: [
            {
                date: "2026-04-01",
                shipImage: "images/ship2_260401.jpg",
                pathImage: "images/path2_260401.jpg",
                firstTime: "14:00",
                firstPos: "무의도 부근",
                lastTime: "15:30",
                lastPos: "잠진도 선착장",
                crewCount: 4,
                handover: "관광 목적으로 보임, 안전 교육 이수 확인"
            }
        ]
    },
    {
        name: "선박 1",
        tonnage: "2.5t",
        type: "어선",
        number: "경기 제12345호",
        tel: "010-1234-5678",
        tags: ["흰색 선체", "초록색 천막", "낚시 도구", "선외기", "흰색 선체", "초록색 천막", "낚시 도구", "선외기", "흰색 선체", "초록색 천막", "낚시 도구", "선외기", "흰색 선체", "초록색 천막", "낚시 도구", "선외기", "흰색 선체", "초록색 천막", "낚시 도구", "선외기", "흰색 선체", "초록색 천막", "낚시 도구", "선외기", "흰색 선체", "초록색 천막", "낚시 도구", "선외기", "흰색 선체", "초록색 천막", "낚시 도구", "선외기","흰색 선체", "초록색 천막", "낚시 도구", "선외기","흰색 선체", "초록색 천막", "낚시 도구", "선외기"],
        history: [
            {
                date: "2026-03-20",
                shipImage: "images/ship1_260320.jpg",
                pathImage: "images/path1_260320.jpg",
                firstTime: "08:30",
                firstPos: "인천대교 하단",
                lastTime: "17:45",
                lastPos: "소래포구 입구",
                crewCount: 3,
                handover: "특이사항 없음, 낚시 활동 중"
            },
            {
                date: "2026-03-14",
                shipImage: "images/ship1_260314.jpg",
                pathImage: "images/path1_260314.jpg",
                firstTime: "09:15",
                firstPos: "영종도 남단",
                lastTime: "16:20",
                lastPos: "인천항 부근",
                crewCount: 2,
                handover: "야간 조업 준비 중으로 보임"
            }
        ]
    },
    {
        name: "선박 2",
        tonnage: "1.5t",
        type: "레저보트",
        number: "인천-레저-9988",
        tel: "010-9988-7766",
        tags: ["파란색 스트라이프", "빠름", "소형"],
        history: [
            {
                date: "2026-04-01",
                shipImage: "images/ship2_260401.jpg",
                pathImage: "images/path2_260401.jpg",
                firstTime: "14:00",
                firstPos: "무의도 부근",
                lastTime: "15:30",
                lastPos: "잠진도 선착장",
                crewCount: 4,
                handover: "관광 목적으로 보임, 안전 교육 이수 확인"
            }
        ]
    },
    {
        name: "선박 1",
        tonnage: "2.5t",
        type: "어선",
        number: "경기 제12345호",
        tel: "010-1234-5678",
        tags: ["흰색 선체", "초록색 천막", "낚시 도구", "선외기", "흰색 선체", "초록색 천막", "낚시 도구", "선외기", "흰색 선체", "초록색 천막", "낚시 도구", "선외기", "흰색 선체", "초록색 천막", "낚시 도구", "선외기", "흰색 선체", "초록색 천막", "낚시 도구", "선외기", "흰색 선체", "초록색 천막", "낚시 도구", "선외기", "흰색 선체", "초록색 천막", "낚시 도구", "선외기", "흰색 선체", "초록색 천막", "낚시 도구", "선외기","흰색 선체", "초록색 천막", "낚시 도구", "선외기","흰색 선체", "초록색 천막", "낚시 도구", "선외기"],
        history: [
            {
                date: "2026-03-20",
                shipImage: "images/ship1_260320.jpg",
                pathImage: "images/path1_260320.jpg",
                firstTime: "08:30",
                firstPos: "인천대교 하단",
                lastTime: "17:45",
                lastPos: "소래포구 입구",
                crewCount: 3,
                handover: "특이사항 없음, 낚시 활동 중"
            },
            {
                date: "2026-03-14",
                shipImage: "images/ship1_260314.jpg",
                pathImage: "images/path1_260314.jpg",
                firstTime: "09:15",
                firstPos: "영종도 남단",
                lastTime: "16:20",
                lastPos: "인천항 부근",
                crewCount: 2,
                handover: "야간 조업 준비 중으로 보임"
            }
        ]
    },
    {
        name: "선박 2",
        tonnage: "1.5t",
        type: "레저보트",
        number: "인천-레저-9988",
        tel: "010-9988-7766",
        tags: ["파란색 스트라이프", "빠름", "소형"],
        history: [
            {
                date: "2026-04-01",
                shipImage: "images/ship2_260401.jpg",
                pathImage: "images/path2_260401.jpg",
                firstTime: "14:00",
                firstPos: "무의도 부근",
                lastTime: "15:30",
                lastPos: "잠진도 선착장",
                crewCount: 4,
                handover: "관광 목적으로 보임, 안전 교육 이수 확인"
            }
        ]
    },
    {
        name: "선박 2",
        tonnage: "1.5t",
        type: "레저보트",
        number: "인천-레저-9988",
        tel: "010-9988-7766",
        tags: ["파란색 스트라이프", "빠름", "소형"],
        history: [
            {
                date: "2026-04-01",
                shipImage: "images/ship2_260401.jpg",
                pathImage: "images/path2_260401.jpg",
                firstTime: "14:00",
                firstPos: "무의도 부근",
                lastTime: "15:30",
                lastPos: "잠진도 선착장",
                crewCount: 4,
                handover: "관광 목적으로 보임, 안전 교육 이수 확인"
            }
        ]
    },
    {
        name: "선박 2",
        tonnage: "1.5t",
        type: "레저보트",
        number: "인천-레저-9988",
        tel: "010-9988-7766",
        tags: ["파란색 스트라이프", "빠름", "소형"],
        history: [
            {
                date: "2026-04-01",
                shipImage: "images/ship2_260401.jpg",
                pathImage: "images/path2_260401.jpg",
                firstTime: "14:00",
                firstPos: "무의도 부근",
                lastTime: "15:30",
                lastPos: "잠진도 선착장",
                crewCount: 4,
                handover: "관광 목적으로 보임, 안전 교육 이수 확인"
            }
        ]
    },
    {
        name: "선박 2",
        tonnage: "1.5t",
        type: "레저보트",
        number: "인천-레저-9988",
        tel: "010-9988-7766",
        tags: ["파란색 스트라이프", "빠름", "소형"],
        history: [
            {
                date: "2026-04-01",
                shipImage: "images/ship2_260401.jpg",
                pathImage: "images/path2_260401.jpg",
                firstTime: "14:00",
                firstPos: "무의도 부근",
                lastTime: "15:30",
                lastPos: "잠진도 선착장",
                crewCount: 4,
                handover: "관광 목적으로 보임, 안전 교육 이수 확인"
            }
        ]
    },
    {
        name: "선박 2",
        tonnage: "1.5t",
        type: "레저보트",
        number: "인천-레저-9988",
        tel: "010-9988-7766",
        tags: ["파란색 스트라이프", "빠름", "소형"],
        history: [
            {
                date: "2026-04-01",
                shipImage: "images/ship2_260401.jpg",
                pathImage: "images/path2_260401.jpg",
                firstTime: "14:00",
                firstPos: "무의도 부근",
                lastTime: "15:30",
                lastPos: "잠진도 선착장",
                crewCount: 4,
                handover: "관광 목적으로 보임, 안전 교육 이수 확인"
            }
        ]
    },
    {
        name: "선박 2",
        tonnage: "1.5t",
        type: "레저보트",
        number: "인천-레저-9988",
        tel: "010-9988-7766",
        tags: ["파란색 스트라이프", "빠름", "소형"],
        history: [
            {
                date: "2026-04-01",
                shipImage: "images/ship2_260401.jpg",
                pathImage: "images/path2_260401.jpg",
                firstTime: "14:00",
                firstPos: "무의도 부근",
                lastTime: "15:30",
                lastPos: "잠진도 선착장",
                crewCount: 4,
                handover: "관광 목적으로 보임, 안전 교육 이수 확인"
            }
        ]
    },
    {
        name: "선박 2",
        tonnage: "1.5t",
        type: "레저보트",
        number: "인천-레저-9988",
        tel: "010-9988-7766",
        tags: ["파란색 스트라이프", "빠름", "소형"],
        history: [
            {
                date: "2026-04-01",
                shipImage: "images/ship2_260401.jpg",
                pathImage: "images/path2_260401.jpg",
                firstTime: "14:00",
                firstPos: "무의도 부근",
                lastTime: "15:30",
                lastPos: "잠진도 선착장",
                crewCount: 4,
                handover: "관광 목적으로 보임, 안전 교육 이수 확인"
            }
        ]
    },
    {
        name: "선박 2",
        tonnage: "1.5t",
        type: "레저보트",
        number: "인천-레저-9988",
        tel: "010-9988-7766",
        tags: ["파란색 스트라이프", "빠름", "소형"],
        history: [
            {
                date: "2026-04-01",
                shipImage: "images/ship2_260401.jpg",
                pathImage: "images/path2_260401.jpg",
                firstTime: "14:00",
                firstPos: "무의도 부근",
                lastTime: "15:30",
                lastPos: "잠진도 선착장",
                crewCount: 4,
                handover: "관광 목적으로 보임, 안전 교육 이수 확인"
            }
        ]
    },
    {
        name: "선박 2",
        tonnage: "1.5t",
        type: "레저보트",
        number: "인천-레저-9988",
        tel: "010-9988-7766",
        tags: ["파란색 스트라이프", "빠름", "소형"],
        history: [
            {
                date: "2026-04-01",
                shipImage: "images/ship2_260401.jpg",
                pathImage: "images/path2_260401.jpg",
                firstTime: "14:00",
                firstPos: "무의도 부근",
                lastTime: "15:30",
                lastPos: "잠진도 선착장",
                crewCount: 4,
                handover: "관광 목적으로 보임, 안전 교육 이수 확인"
            }
        ]
    },
    {
        name: "선박 2",
        tonnage: "1.5t",
        type: "레저보트",
        number: "인천-레저-9988",
        tel: "010-9988-7766",
        tags: ["파란색 스트라이프", "빠름", "소형"],
        history: [
            {
                date: "2026-04-01",
                shipImage: "images/ship2_260401.jpg",
                pathImage: "images/path2_260401.jpg",
                firstTime: "14:00",
                firstPos: "무의도 부근",
                lastTime: "15:30",
                lastPos: "잠진도 선착장",
                crewCount: 4,
                handover: "관광 목적으로 보임, 안전 교육 이수 확인"
            }
        ]
    },
    {
        name: "선박 2",
        tonnage: "1.5t",
        type: "레저보트",
        number: "인천-레저-9988",
        tel: "010-9988-7766",
        tags: ["파란색 스트라이프", "빠름", "소형"],
        history: [
            {
                date: "2026-04-01",
                shipImage: "images/ship2_260401.jpg",
                pathImage: "images/path2_260401.jpg",
                firstTime: "14:00",
                firstPos: "무의도 부근",
                lastTime: "15:30",
                lastPos: "잠진도 선착장",
                crewCount: 4,
                handover: "관광 목적으로 보임, 안전 교육 이수 확인"
            }
        ]
    },
    {
        name: "선박 2",
        tonnage: "1.5t",
        type: "레저보트",
        number: "인천-레저-9988",
        tel: "010-9988-7766",
        tags: ["파란색 스트라이프", "빠름", "소형"],
        history: [
            {
                date: "2026-04-01",
                shipImage: "images/ship2_260401.jpg",
                pathImage: "images/path2_260401.jpg",
                firstTime: "14:00",
                firstPos: "무의도 부근",
                lastTime: "15:30",
                lastPos: "잠진도 선착장",
                crewCount: 4,
                handover: "관광 목적으로 보임, 안전 교육 이수 확인"
            }
        ]
    },
    {
        name: "선박 2",
        tonnage: "1.5t",
        type: "레저보트",
        number: "인천-레저-9988",
        tel: "010-9988-7766",
        tags: ["파란색 스트라이프", "빠름", "소형"],
        history: [
            {
                date: "2026-04-01",
                shipImage: "images/ship2_260401.jpg",
                pathImage: "images/path2_260401.jpg",
                firstTime: "14:00",
                firstPos: "무의도 부근",
                lastTime: "15:30",
                lastPos: "잠진도 선착장",
                crewCount: 4,
                handover: "관광 목적으로 보임, 안전 교육 이수 확인"
            }
        ]
    },
    {
        name: "선박 2",
        tonnage: "1.5t",
        type: "레저보트",
        number: "인천-레저-9988",
        tel: "010-9988-7766",
        tags: ["파란색 스트라이프", "빠름", "소형"],
        history: [
            {
                date: "2026-04-01",
                shipImage: "images/ship2_260401.jpg",
                pathImage: "images/path2_260401.jpg",
                firstTime: "14:00",
                firstPos: "무의도 부근",
                lastTime: "15:30",
                lastPos: "잠진도 선착장",
                crewCount: 4,
                handover: "관광 목적으로 보임, 안전 교육 이수 확인"
            }
        ]
    },
    {
        name: "선박 2",
        tonnage: "1.5t",
        type: "레저보트",
        number: "인천-레저-9988",
        tel: "010-9988-7766",
        tags: ["파란색 스트라이프", "빠름", "소형"],
        history: [
            {
                date: "2026-04-01",
                shipImage: "images/ship2_260401.jpg",
                pathImage: "images/path2_260401.jpg",
                firstTime: "14:00",
                firstPos: "무의도 부근",
                lastTime: "15:30",
                lastPos: "잠진도 선착장",
                crewCount: 4,
                handover: "관광 목적으로 보임, 안전 교육 이수 확인"
            }
        ]
    },
    {
        name: "선박 2",
        tonnage: "1.5t",
        type: "레저보트",
        number: "인천-레저-9988",
        tel: "010-9988-7766",
        tags: ["파란색 스트라이프", "빠름", "소형"],
        history: [
            {
                date: "2026-04-01",
                shipImage: "images/ship2_260401.jpg",
                pathImage: "images/path2_260401.jpg",
                firstTime: "14:00",
                firstPos: "무의도 부근",
                lastTime: "15:30",
                lastPos: "잠진도 선착장",
                crewCount: 4,
                handover: "관광 목적으로 보임, 안전 교육 이수 확인"
            }
        ]
    },
    {
        name: "선박 2",
        tonnage: "1.5t",
        type: "레저보트",
        number: "인천-레저-9988",
        tel: "010-9988-7766",
        tags: ["파란색 스트라이프", "빠름", "소형"],
        history: [
            {
                date: "2026-04-01",
                shipImage: "images/ship2_260401.jpg",
                pathImage: "images/path2_260401.jpg",
                firstTime: "14:00",
                firstPos: "무의도 부근",
                lastTime: "15:30",
                lastPos: "잠진도 선착장",
                crewCount: 4,
                handover: "관광 목적으로 보임, 안전 교육 이수 확인"
            }
        ]
    },
    {
        name: "선박 2",
        tonnage: "1.5t",
        type: "레저보트",
        number: "인천-레저-9988",
        tel: "010-9988-7766",
        tags: ["파란색 스트라이프", "빠름", "소형"],
        history: [
            {
                date: "2026-04-01",
                shipImage: "images/ship2_260401.jpg",
                pathImage: "images/path2_260401.jpg",
                firstTime: "14:00",
                firstPos: "무의도 부근",
                lastTime: "15:30",
                lastPos: "잠진도 선착장",
                crewCount: 4,
                handover: "관광 목적으로 보임, 안전 교육 이수 확인"
            }
        ]
    },
    {
        name: "선박 2",
        tonnage: "1.5t",
        type: "레저보트",
        number: "인천-레저-9988",
        tel: "010-9988-7766",
        tags: ["파란색 스트라이프", "빠름", "소형"],
        history: [
            {
                date: "2026-04-01",
                shipImage: "images/ship2_260401.jpg",
                pathImage: "images/path2_260401.jpg",
                firstTime: "14:00",
                firstPos: "무의도 부근",
                lastTime: "15:30",
                lastPos: "잠진도 선착장",
                crewCount: 4,
                handover: "관광 목적으로 보임, 안전 교육 이수 확인"
            }
        ]
    },
    {
        name: "선박 2",
        tonnage: "1.5t",
        type: "레저보트",
        number: "인천-레저-9988",
        tel: "010-9988-7766",
        tags: ["파란색 스트라이프", "빠름", "소형"],
        history: [
            {
                date: "2026-04-01",
                shipImage: "images/ship2_260401.jpg",
                pathImage: "images/path2_260401.jpg",
                firstTime: "14:00",
                firstPos: "무의도 부근",
                lastTime: "15:30",
                lastPos: "잠진도 선착장",
                crewCount: 4,
                handover: "관광 목적으로 보임, 안전 교육 이수 확인"
            }
        ]
    },
    {
        name: "선박 2",
        tonnage: "1.5t",
        type: "레저보트",
        number: "인천-레저-9988",
        tel: "010-9988-7766",
        tags: ["파란색 스트라이프", "빠름", "소형"],
        history: [
            {
                date: "2026-04-01",
                shipImage: "images/ship2_260401.jpg",
                pathImage: "images/path2_260401.jpg",
                firstTime: "14:00",
                firstPos: "무의도 부근",
                lastTime: "15:30",
                lastPos: "잠진도 선착장",
                crewCount: 4,
                handover: "관광 목적으로 보임, 안전 교육 이수 확인"
            }
        ]
    },
    {
        name: "선박 2",
        tonnage: "1.5t",
        type: "레저보트",
        number: "인천-레저-9988",
        tel: "010-9988-7766",
        tags: ["파란색 스트라이프", "빠름", "소형"],
        history: [
            {
                date: "2026-04-01",
                shipImage: "images/ship2_260401.jpg",
                pathImage: "images/path2_260401.jpg",
                firstTime: "14:00",
                firstPos: "무의도 부근",
                lastTime: "15:30",
                lastPos: "잠진도 선착장",
                crewCount: 4,
                handover: "관광 목적으로 보임, 안전 교육 이수 확인"
            }
        ]
    }
];
