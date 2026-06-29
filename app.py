from flask import Flask, request, jsonify, render_template, send_from_directory
from ultralytics import YOLO
from PIL import Image
import os, uuid, cv2, numpy as np

app = Flask(__name__)

UPLOAD_FOLDER = 'uploads'
RESULT_FOLDER = 'results'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULT_FOLDER, exist_ok=True)

# ─── Load your model ───────────────────────────────────────────
# Put your best.pt in the same folder as app.py
MODEL_PATH = 'best.pt'
model = YOLO(MODEL_PATH)

ALLOWED = {'jpg', 'jpeg', 'png', 'webp'}

def allowed(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/predict', methods=['POST'])
def predict():
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400

    file = request.files['image']
    if file.filename == '' or not allowed(file.filename):
        return jsonify({'error': 'Invalid file type. Use JPG or PNG.'}), 400

    # Save uploaded image
    uid = str(uuid.uuid4())[:8]
    ext = file.filename.rsplit('.', 1)[1].lower()
    input_path  = os.path.join(UPLOAD_FOLDER, f'{uid}_input.{ext}')
    result_path = os.path.join(RESULT_FOLDER, f'{uid}_result.jpg')
    file.save(input_path)

    # Run inference
    conf = float(request.form.get('conf', 0.4))
    results = model.predict(input_path, conf=conf, save=False)
    r = results[0]

    # Draw boxes manually so we control the output path
    img = cv2.imread(input_path)
    boxes = r.boxes

    detections = []
    for box in boxes:
        x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
        conf_score = float(box.conf[0])
        cls = int(box.cls[0])
        label = model.names[cls]

        # Draw box
        cv2.rectangle(img, (x1, y1), (x2, y2), (0, 200, 100), 3)
        tag = f'{label} {conf_score:.0%}'
        (tw, th), _ = cv2.getTextSize(tag, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)
        cv2.rectangle(img, (x1, y1 - th - 10), (x1 + tw + 8, y1), (0, 200, 100), -1)
        cv2.putText(img, tag, (x1 + 4, y1 - 5),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

        detections.append({
            'label': label,
            'confidence': round(conf_score * 100, 1),
            'bbox': [x1, y1, x2, y2]
        })

    cv2.imwrite(result_path, img)

    return jsonify({
        'result_image': f'/results/{uid}_result.jpg',
        'count': len(detections),
        'detections': detections
    })

@app.route('/results/<filename>')
def result_file(filename):
    return send_from_directory(RESULT_FOLDER, filename)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
