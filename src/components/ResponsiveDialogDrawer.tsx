import useAppSettings from '@/application/appSettings/useAppSettings'

import Dialog, { DialogProps } from './Dialog'
import Drawer, { DrawerProps } from './Drawer'

export default function ResponsiveDialogDrawer(props: DrawerProps | DialogProps) {
  const isMobile = useAppSettings((s) => s.isMobile)
  return isMobile ? <Drawer {...props}>{props.children}</Drawer> : <Dialog {...props}>{props.children}</Dialog>
}
