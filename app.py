from flask import Flask, send_from_directory

app = Flask(__name__)

#Route HTML files
@app.route('/')
def route_landing_page():
    return send_from_directory('web/html', 'landing-page.html')

# Route CSS files
@app.route('/<filename>.css')
def route_css(filename):
    return send_from_directory('web/css', filename + '.css')
#Route JS files
@app.route('/<filename>.js')
def route_js(filename):
    return send_from_directory('web/js', filename + '.js')

if __name__ == '__main__':
    app.run(debug=True, port=8080)
