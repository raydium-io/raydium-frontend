import DropdownTabs, { DropdownTabProps } from './DropdownTabs'
import Row from './Row'
import RowTabs, { RowTabProps } from './RowTabs'

export type TabsProps<T extends string> = RowTabProps<T> &
  DropdownTabProps<T> & {
    /** values index after offset is dropdown props */
    showOffset: number
  }
export default function Tabs<T extends string>(props: TabsProps<T>) {
  const showTabValues = props.values.slice(0, props.showOffset)
  const dropdownTabValues = props.values.slice(props.showOffset)
  return (
    <Row>
      <RowTabs {...props} values={showTabValues} />
      <DropdownTabs {...props} values={dropdownTabValues} />
    </Row>
  )
}
