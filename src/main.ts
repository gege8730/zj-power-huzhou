import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import VxeTable from 'vxe-table'
import router from './router'
import './styles/global.css'
import 'ol/ol.css'
import 'element-plus/es/components/message/style/css'
import 'vxe-table/lib/style.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(VxeTable)
app.mount('#app')
