import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './styles/global.css'
import 'ol/ol.css'
import 'element-plus/es/components/message/style/css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.mount('#app')
