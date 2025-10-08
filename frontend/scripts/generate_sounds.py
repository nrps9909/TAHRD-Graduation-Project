#!/usr/bin/env python3
"""
音效生成腳本
使用 Python 的 wave 模組生成簡單的測試音效
這些是佔位符音效，建議後續替換為專業音效
"""

import wave
import struct
import math
import os

# 音效參數
SAMPLE_RATE = 44100
CHANNELS = 1
SAMPLE_WIDTH = 2

def generate_tone(frequency, duration, volume=0.3):
    """生成純音調"""
    num_samples = int(SAMPLE_RATE * duration)
    samples = []

    for i in range(num_samples):
        # 生成正弦波
        value = math.sin(2 * math.pi * frequency * i / SAMPLE_RATE)
        # 添加淡入淡出效果
        fade_samples = int(SAMPLE_RATE * 0.01)  # 10ms 淡入淡出
        if i < fade_samples:
            value *= i / fade_samples
        elif i > num_samples - fade_samples:
            value *= (num_samples - i) / fade_samples

        # 轉換為 16-bit 整數
        sample = int(value * volume * 32767)
        samples.append(sample)

    return samples

def generate_meow(output_path, pitch='medium'):
    """生成貓叫聲（使用音調變化模擬）"""
    # 不同音調的貓叫
    if pitch == 'high':  # 開心/問候
        freqs = [(800, 0.08), (600, 0.08), (700, 0.09)]
    elif pitch == 'low':  # 思考
        freqs = [(400, 0.1), (350, 0.05)]
    elif pitch == 'curious':  # 好奇
        freqs = [(500, 0.08), (700, 0.08), (600, 0.04)]
    else:  # medium - 普通
        freqs = [(600, 0.1), (500, 0.08)]

    all_samples = []
    for freq, duration in freqs:
        samples = generate_tone(freq, duration, volume=0.25)
        all_samples.extend(samples)

    save_wav(output_path, all_samples)

def generate_purr(output_path):
    """生成呼嚕聲（低頻振動）"""
    duration = 2.0
    num_samples = int(SAMPLE_RATE * duration)
    samples = []

    # 使用多個低頻混合
    for i in range(num_samples):
        value = 0
        value += 0.3 * math.sin(2 * math.pi * 25 * i / SAMPLE_RATE)  # 低頻基音
        value += 0.2 * math.sin(2 * math.pi * 50 * i / SAMPLE_RATE)  # 諧波

        # 添加輕微的調制
        modulation = 0.5 + 0.5 * math.sin(2 * math.pi * 3 * i / SAMPLE_RATE)
        value *= modulation

        # 淡入淡出
        fade_samples = int(SAMPLE_RATE * 0.1)
        if i < fade_samples:
            value *= i / fade_samples
        elif i > num_samples - fade_samples:
            value *= (num_samples - i) / fade_samples

        sample = int(value * 0.2 * 32767)
        samples.append(sample)

    save_wav(output_path, samples)

def generate_click(output_path):
    """生成點擊音效"""
    # 短促的高頻音
    samples = generate_tone(2000, 0.05, volume=0.2)
    save_wav(output_path, samples)

def generate_notification(output_path):
    """生成通知音效（雙音調）"""
    samples1 = generate_tone(800, 0.1, volume=0.25)
    samples2 = generate_tone(1000, 0.12, volume=0.25)
    all_samples = samples1 + samples2
    save_wav(output_path, all_samples)

def generate_success(output_path):
    """生成成功音效（上升音調）"""
    freqs = [(600, 0.08), (800, 0.08), (1000, 0.1)]
    all_samples = []
    for freq, duration in freqs:
        samples = generate_tone(freq, duration, volume=0.25)
        all_samples.extend(samples)
    save_wav(output_path, all_samples)

def generate_typing(output_path):
    """生成打字音效"""
    samples = generate_tone(1500, 0.04, volume=0.15)
    save_wav(output_path, samples)

def generate_message_sent(output_path):
    """生成訊息發送音效（輕快向上）"""
    samples1 = generate_tone(700, 0.06, volume=0.2)
    samples2 = generate_tone(900, 0.08, volume=0.2)
    all_samples = samples1 + samples2
    save_wav(output_path, all_samples)

def generate_message_received(output_path):
    """生成訊息接收音效（柔和向下）"""
    samples1 = generate_tone(900, 0.06, volume=0.2)
    samples2 = generate_tone(700, 0.08, volume=0.2)
    all_samples = samples1 + samples2
    save_wav(output_path, all_samples)

def generate_achievement(output_path):
    """生成成就音效（歡快的音階）"""
    freqs = [(523, 0.1), (659, 0.1), (784, 0.1), (1047, 0.15)]  # C-E-G-C 和弦
    all_samples = []
    for freq, duration in freqs:
        samples = generate_tone(freq, duration, volume=0.25)
        all_samples.extend(samples)
    save_wav(output_path, all_samples)

def save_wav(output_path, samples):
    """保存為 WAV 文件"""
    with wave.open(output_path, 'w') as wav_file:
        wav_file.setnchannels(CHANNELS)
        wav_file.setsampwidth(SAMPLE_WIDTH)
        wav_file.setframerate(SAMPLE_RATE)

        # 寫入樣本
        for sample in samples:
            wav_file.writeframes(struct.pack('<h', sample))

def convert_to_mp3(wav_path, mp3_path):
    """嘗試轉換為 MP3（需要 ffmpeg）"""
    try:
        import subprocess
        subprocess.run(['ffmpeg', '-i', wav_path, '-acodec', 'libmp3lame',
                       '-b:a', '128k', mp3_path, '-y'],
                      capture_output=True, check=True)
        os.remove(wav_path)  # 刪除臨時 WAV 文件
        return True
    except:
        # 如果轉換失敗，重命名 WAV 為 MP3（瀏覽器也支持 WAV）
        os.rename(wav_path, mp3_path)
        print(f"  ⚠️  無法轉換為真正的 MP3，使用 WAV 格式（仍可正常使用）")
        return False

def main():
    # 輸出目錄
    output_dir = os.path.join(os.path.dirname(__file__), '../public/sounds')
    os.makedirs(output_dir, exist_ok=True)

    print("🎵 開始生成音效文件...")
    print(f"📁 輸出目錄: {output_dir}\n")

    sounds = [
        ('meow-greeting.wav', lambda p: generate_meow(p, 'high'), '問候貓叫 🐱'),
        ('meow-happy.wav', lambda p: generate_meow(p, 'high'), '開心貓叫 😊'),
        ('meow-curious.wav', lambda p: generate_meow(p, 'curious'), '好奇貓叫 🤔'),
        ('meow-thinking.wav', lambda p: generate_meow(p, 'low'), '思考貓叫 💭'),
        ('purr.wav', generate_purr, '呼嚕聲 😌'),
        ('typing.wav', generate_typing, '打字音效 ⌨️'),
        ('message-sent.wav', generate_message_sent, '訊息發送 📤'),
        ('message-received.wav', generate_message_received, '訊息接收 📥'),
        ('notification.wav', generate_notification, '通知音效 🔔'),
        ('button-click.wav', generate_click, '按鈕點擊 👆'),
        ('upload-success.wav', generate_success, '上傳成功 ✅'),
        ('achievement.wav', generate_achievement, '成就達成 🏆'),
    ]

    for filename, generator, description in sounds:
        wav_path = os.path.join(output_dir, filename)
        mp3_path = wav_path.replace('.wav', '.mp3')

        print(f"生成: {description}")
        generator(wav_path)
        convert_to_mp3(wav_path, mp3_path)
        print(f"  ✅ {filename.replace('.wav', '.mp3')}\n")

    print("=" * 60)
    print("✨ 所有音效生成完成！")
    print("\n📝 注意事項：")
    print("  • 這些是使用純音調合成的測試音效")
    print("  • 建議後續替換為專業錄製的音效")
    print("  • 參考 public/sounds/README.md 獲取專業音效")
    print("  • 當前音效已可正常使用，不影響功能")
    print("=" * 60)

if __name__ == '__main__':
    main()
