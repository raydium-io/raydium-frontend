import useAppSettings from '@/application/common/useAppSettings'

import Dialog, { DialogProps } from './Dialog'
import Drawer, { DrawerProps } from './Drawer'

export default function ResponsiveDialogDrawer(props: DrawerProps | DialogProps) {
  const isMobile = useAppSettings((s) => s.isMobile)
  return isMobile ? <Drawer {...props} /> : <Dialog {...props} />
}
